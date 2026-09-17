from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.core.database import db
from app.core.security import ApiError, get_current_admin
from app.schemas import OrderCreate, OrderStatusPatch
from app.services.order_service import attach_whatsapp, create_order, restock_items

router = APIRouter(prefix="/api/orders", tags=["orders"])


def clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


@router.post("", status_code=201)
async def create(data: OrderCreate):
    order = await create_order(data)
    return {"success": True, "order": order}


@router.get("")
async def list_orders(status: Optional[str] = Query(default=None),
                      _: dict = Depends(get_current_admin)):
    filt = {"order_status": status} if status else {}
    orders = await db.orders.find(filt).sort("created_at", -1).to_list(500)
    return [clean(o) for o in orders]


@router.get("/{order_id}")
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise ApiError(404, "ORDER_NOT_FOUND", "Pedido no encontrado")
    return await attach_whatsapp(clean(order))


@router.patch("/{order_id}/status")
async def patch_status(order_id: str, data: OrderStatusPatch, _: dict = Depends(get_current_admin)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise ApiError(404, "ORDER_NOT_FOUND", "Pedido no encontrado")
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.order_status:
        updates["order_status"] = data.order_status
    if data.payment_status:
        updates["payment_status"] = data.payment_status
    await db.orders.update_one({"id": order_id}, {"$set": updates})
    if data.order_status == "cancelled" and order["order_status"] != "cancelled":
        await restock_items(order["items"])
    updated = await db.orders.find_one({"id": order_id})
    return await attach_whatsapp(clean(updated))
