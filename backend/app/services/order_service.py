from datetime import datetime, timezone
from app.core.database import db
from app.core.security import ApiError
from app.schemas import OrderCreate
from app.services.whatsapp_service import build_order_whatsapp_url


def to_cents(amount) -> int:
    return int(round(float(amount) * 100))


async def get_settings() -> dict:
    doc = await db.store_settings.find_one({"id": "store"})
    return doc or {}


async def next_folio() -> str:
    doc = await db.counters.find_one_and_update(
        {"_id": "order_seq"}, {"$inc": {"seq": 1}}, upsert=True, return_document=True)
    return f"EL-{doc['seq']:06d}"


def _strip(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


async def restock_items(items: list):
    for it in items:
        await db.products.update_one({"id": it["product_id"]}, {"$inc": {"stock": it["quantity"]}})


async def create_order(data: OrderCreate) -> dict:
    settings = await get_settings()
    if data.delivery_method == "pickup":
        if not settings.get("pickup_enabled", True):
            raise ApiError(400, "PICKUP_DISABLED", "La entrega en punto de encuentro no está disponible")
        if not data.pickup_point_id:
            raise ApiError(400, "PICKUP_POINT_REQUIRED", "Selecciona un punto de encuentro")
        point = await db.pickup_points.find_one({"id": data.pickup_point_id, "enabled": True})
        if not point:
            raise ApiError(400, "PICKUP_POINT_INVALID", "El punto de encuentro seleccionado no está disponible")
    else:
        if not settings.get("shipping_enabled", True):
            raise ApiError(400, "SHIPPING_DISABLED", "El envío a domicilio no está disponible")
        if not data.address:
            raise ApiError(400, "ADDRESS_REQUIRED", "Proporciona una dirección de entrega válida")
        point = None

    method = await db.delivery_methods.find_one({"code": data.delivery_method, "enabled": True})
    if not method:
        raise ApiError(400, "DELIVERY_METHOD_INVALID", "El método de entrega no está disponible")

    decremented, items, subtotal_cents = [], [], 0
    try:
        for it in data.items:
            prod = await db.products.find_one_and_update(
                {"id": it.product_id, "active": True, "stock": {"$gte": it.quantity}},
                {"$inc": {"stock": -it.quantity}})
            if not prod:
                raise ApiError(409, "INSUFFICIENT_STOCK",
                               f"Producto sin stock disponible: {it.product_id}")
            decremented.append({"product_id": it.product_id, "quantity": it.quantity})
            price_cents = to_cents(prod["price"])
            line = price_cents * it.quantity
            subtotal_cents += line
            items.append({
                "product_id": prod["id"], "name": prod["name"], "quantity": it.quantity,
                "price": prod["price"], "price_cents": price_cents, "subtotal_cents": line,
                "image": (prod.get("images") or [""])[0],
            })
    except Exception:
        await restock_items(decremented)
        raise

    shipping_cents = to_cents(method.get("cost", 0))
    total_cents = subtotal_cents + shipping_cents
    folio = await next_folio()
    now = datetime.now(timezone.utc).isoformat()
    import uuid
    order = {
        "id": str(uuid.uuid4()),
        "folio": folio,
        "customer": data.customer.model_dump(),
        "items": items,
        "subtotal_cents": subtotal_cents,
        "shipping_cents": shipping_cents,
        "total_cents": total_cents,
        "currency": "MXN",
        "delivery_method": data.delivery_method,
        "pickup_point": ({"id": point["id"], "name": point["name"], "address": point["address"], "city": point["city"]} if point else None),
        "address": (data.address.model_dump() if data.address else None),
        "payment_method": data.payment_method,
        "payment_status": "pending",
        "order_status": "pending",
        "stripe_session_id": None,
        "notes": data.notes,
        "created_at": now,
        "updated_at": now,
    }
    await db.orders.insert_one(order)
    email = data.customer.email.lower()
    await db.customers.update_one(
        {"email": email},
        {"$set": {**data.customer.model_dump(), "email": email, "updated_at": now},
         "$inc": {"orders_count": 1},
         "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now}},
        upsert=True)
    order = _strip(order)
    order["whatsapp_url"] = build_order_whatsapp_url(order, settings)
    return order


async def attach_whatsapp(order: dict) -> dict:
    settings = await get_settings()
    order["whatsapp_url"] = build_order_whatsapp_url(order, settings)
    return order
