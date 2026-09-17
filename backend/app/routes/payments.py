import os
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Request

from app.core.database import db
from app.core.security import ApiError
from app.schemas import CheckoutCreate
from app.services.order_service import restock_items, to_cents

router = APIRouter(prefix="/api", tags=["payments"])

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or os.environ.get("STRIPE_API_KEY") or "sk_test_emergent"
WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/payments/create-checkout")
async def create_checkout(data: CheckoutCreate):
    order = await db.orders.find_one({"id": data.order_id})
    if not order:
        raise ApiError(404, "ORDER_NOT_FOUND", "Pedido no encontrado")
    if order["payment_method"] != "card":
        raise ApiError(400, "NOT_CARD_ORDER", "Este pedido no es de pago con tarjeta")
    if order["payment_status"] == "paid":
        raise ApiError(400, "ALREADY_PAID", "Este pedido ya fue pagado")

    line_items = [{
        "price_data": {"currency": "mxn", "unit_amount": it["price_cents"],
                       "product_data": {"name": it["name"], "tax_code": "txcd_99999999"}},
        "quantity": it["quantity"],
    } for it in order["items"]]
    if order["shipping_cents"] > 0:
        line_items.append({
            "price_data": {"currency": "mxn", "unit_amount": order["shipping_cents"],
                           "product_data": {"name": "Envío", "tax_code": "txcd_99999999"}},
            "quantity": 1})

    origin = data.origin_url.rstrip("/")
    kwargs = dict(
        line_items=line_items, mode="payment",
        success_url=f"{origin}/pago/exitoso?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{origin}/pago/cancelado?order_id={order['id']}",
        metadata={"order_id": order["id"]}, client_reference_id=order["id"],
    )
    try:
        session = stripe.checkout.Session.create(
            **kwargs, automatic_tax={"enabled": True}, billing_address_collection="required")
    except stripe.error.InvalidRequestError:
        session = stripe.checkout.Session.create(**kwargs)

    await db.payment_transactions.insert_one({
        "session_id": session.id, "order_id": order["id"], "amount_cents": order["total_cents"],
        "currency": "mxn", "status": "initiated", "payment_status": "pending",
        "created_at": _now(), "updated_at": _now()})
    await db.orders.update_one({"id": order["id"]}, {"$set": {"stripe_session_id": session.id, "updated_at": _now()}})
    return {"checkout_url": session.url, "session_id": session.id}


@router.get("/payments/status/{session_id}")
async def payment_status(session_id: str):
    tx = await db.payment_transactions.find_one({"session_id": session_id})
    if not tx:
        raise ApiError(404, "TX_NOT_FOUND", "Transacción no encontrada")
    if tx.get("payment_status") != "paid":
        try:
            s = stripe.checkout.Session.retrieve(session_id)
            if s.payment_status == "paid" or s.status == "complete":
                await _mark_paid(session_id, s.get("payment_intent"))
                tx = await db.payment_transactions.find_one({"session_id": session_id})
        except stripe.error.StripeError:
            pass
    order = await db.orders.find_one({"id": tx["order_id"]}, {"folio": 1})
    return {"session_id": session_id, "status": tx["status"], "payment_status": tx["payment_status"],
            "order_id": tx["order_id"], "folio": order["folio"] if order else None}


async def _mark_paid(session_id: str, payment_intent=None):
    res = await db.payment_transactions.update_one(
        {"session_id": session_id, "payment_status": {"$ne": "paid"}},
        {"$set": {"status": "completed", "payment_status": "paid",
                  "stripe_payment_intent_id": payment_intent, "updated_at": _now()}})
    if res.modified_count:
        tx = await db.payment_transactions.find_one({"session_id": session_id})
        await db.orders.update_one(
            {"id": tx["order_id"], "payment_status": {"$ne": "paid"}},
            {"$set": {"payment_status": "paid", "order_status": "paid", "updated_at": _now()}})


async def _mark_failed(session_id: str, status: str):
    tx = await db.payment_transactions.find_one_and_update(
        {"session_id": session_id, "payment_status": {"$nin": ["paid", status]}},
        {"$set": {"status": status, "payment_status": status, "updated_at": _now()}})
    if tx:
        res = await db.orders.find_one_and_update(
            {"id": tx["order_id"], "payment_status": {"$ne": "paid"}},
            {"$set": {"payment_status": status, "updated_at": _now()}})
        if res:
            await restock_items(res["items"])


async def _handle_event(event: dict):
    obj, t = event["data"]["object"], event["type"]
    if t == "checkout.session.completed":
        await _mark_paid(obj["id"], obj.get("payment_intent"))
    elif t == "checkout.session.async_payment_succeeded":
        await _mark_paid(obj["id"], obj.get("payment_intent"))
    elif t == "checkout.session.async_payment_failed":
        await _mark_failed(obj["id"], "failed")
    elif t == "checkout.session.expired":
        await _mark_failed(obj["id"], "expired")
    elif t == "charge.refunded":
        tx = await db.payment_transactions.find_one({"stripe_payment_intent_id": obj.get("payment_intent")})
        if tx:
            await db.payment_transactions.update_one({"session_id": tx["session_id"]},
                {"$set": {"status": "refunded", "payment_status": "refunded", "updated_at": _now()}})
            await db.orders.update_one({"id": tx["order_id"]},
                {"$set": {"payment_status": "refunded", "updated_at": _now()}})


async def _webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise ApiError(400, "INVALID_SIGNATURE", "Firma inválida")
    await _handle_event(event)
    return {"status": "ok"}


router.add_api_route("/payments/webhook", _webhook, methods=["POST"])
router.add_api_route("/stripe/webhook", _webhook, methods=["POST"])
