import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends

from app.core.database import db
from app.core.security import ApiError, get_current_admin
from app.schemas import DeliveryMethodIn, PickupPointIn, SettingsIn, StockAdjust
from app.services.order_service import get_settings
from app.services.whatsapp_service import build_contact_url

router = APIRouter(prefix="/api", tags=["admin"])


def clean(doc: dict) -> dict:
    if doc:
        doc.pop("_id", None)
    return doc


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Public store config ----------

@router.get("/store/config")
async def public_config():
    s = await get_settings()
    return {
        "store_name": s.get("store_name", "ÉLORIA"),
        "whatsapp_number": s.get("whatsapp_number", ""),
        "whatsapp_contact_url": build_contact_url(s) if s.get("whatsapp_number") else None,
        "bank_name": s.get("bank_name", ""),
        "bank_account_holder": s.get("bank_account_holder", ""),
        "bank_clabe": s.get("bank_clabe", ""),
        "bank_account_number": s.get("bank_account_number", ""),
        "shipping_enabled": s.get("shipping_enabled", True),
        "pickup_enabled": s.get("pickup_enabled", True),
        "shipping_cost": s.get("shipping_cost", 0),
        "currency": "MXN",
    }


@router.get("/delivery-methods")
async def list_delivery_methods():
    return [clean(d) for d in await db.delivery_methods.find({"enabled": True}).to_list(20)]


@router.get("/pickup-points")
async def list_pickup_points():
    return [clean(p) for p in await db.pickup_points.find({"enabled": True}).to_list(100)]


# ---------- Dashboard ----------

@router.get("/admin/dashboard")
async def dashboard(_: dict = Depends(get_current_admin)):
    orders = await db.orders.find().to_list(2000)
    valid = [o for o in orders if o["order_status"] != "cancelled"
             and (o["payment_status"] == "paid" or o["payment_method"] != "card")]
    total = sum(o["total_cents"] for o in valid)
    pending = sum(1 for o in orders if o["order_status"] in ("pending", "paid", "preparing"))
    products = await db.products.find({"active": True}).to_list(500)
    low_stock = [p for p in products if p["stock"] <= p.get("low_stock_threshold", 3)]
    days = []
    today = datetime.now(timezone.utc).date()
    for i in range(13, -1, -1):
        d = today - timedelta(days=i)
        days.append({"date": d.isoformat(), "label": d.strftime("%d/%m"), "total": 0.0, "orders": 0})
    idx = {d["date"]: d for d in days}
    for o in valid:
        d = o["created_at"][:10]
        if d in idx:
            idx[d]["total"] += o["total_cents"] / 100
            idx[d]["orders"] += 1
    recent = sorted(orders, key=lambda o: o["created_at"], reverse=True)[:8]
    return {
        "ventas_totales_cents": total,
        "pedidos_pendientes": pending,
        "ticket_promedio_cents": int(total / len(valid)) if valid else 0,
        "stock_critico": len(low_stock),
        "low_stock_products": [clean(p) for p in low_stock[:8]],
        "sales_by_day": days,
        "recent_orders": [clean(o) for o in recent],
        "customers_count": await db.customers.count_documents({}),
    }


# ---------- Settings ----------

@router.get("/admin/settings")
async def get_admin_settings(_: dict = Depends(get_current_admin)):
    s = await get_settings()
    s.pop("_id", None)
    return s


@router.patch("/admin/settings")
async def update_settings(data: SettingsIn, _: dict = Depends(get_current_admin)):
    await db.store_settings.update_one({"id": "store"},
        {"$set": {**data.model_dump(), "updated_at": _now()}}, upsert=True)
    return await get_admin_settings(_)


# ---------- Customers ----------

@router.get("/admin/customers")
async def list_customers(_: dict = Depends(get_current_admin)):
    return [clean(c) for c in await db.customers.find().sort("created_at", -1).to_list(500)]


# ---------- Delivery methods (admin CRUD) ----------

@router.get("/admin/delivery-methods")
async def admin_delivery_methods(_: dict = Depends(get_current_admin)):
    return [clean(d) for d in await db.delivery_methods.find().to_list(20)]


@router.put("/admin/delivery-methods/{code}")
async def update_delivery_method(code: str, data: DeliveryMethodIn, _: dict = Depends(get_current_admin)):
    if code != data.code:
        raise ApiError(400, "CODE_MISMATCH", "El código no coincide")
    await db.delivery_methods.update_one({"code": code},
        {"$set": {**data.model_dump(), "updated_at": _now()}}, upsert=True)
    return clean(await db.delivery_methods.find_one({"code": code}))


# ---------- Pickup points (admin CRUD) ----------

@router.get("/admin/pickup-points")
async def admin_pickup_points(_: dict = Depends(get_current_admin)):
    return [clean(p) for p in await db.pickup_points.find().to_list(100)]


@router.post("/admin/pickup-points", status_code=201)
async def create_pickup_point(data: PickupPointIn, _: dict = Depends(get_current_admin)):
    doc = {**data.model_dump(), "id": str(uuid.uuid4()), "created_at": _now()}
    await db.pickup_points.insert_one(doc)
    return clean(doc)


@router.put("/admin/pickup-points/{point_id}")
async def update_pickup_point(point_id: str, data: PickupPointIn, _: dict = Depends(get_current_admin)):
    res = await db.pickup_points.update_one({"id": point_id}, {"$set": data.model_dump()})
    if not res.matched_count:
        raise ApiError(404, "PICKUP_POINT_NOT_FOUND", "Punto de encuentro no encontrado")
    return clean(await db.pickup_points.find_one({"id": point_id}))


@router.delete("/admin/pickup-points/{point_id}")
async def delete_pickup_point(point_id: str, _: dict = Depends(get_current_admin)):
    res = await db.pickup_points.delete_one({"id": point_id})
    if not res.deleted_count:
        raise ApiError(404, "PICKUP_POINT_NOT_FOUND", "Punto de encuentro no encontrado")
    return {"success": True}


# ---------- Inventory ----------

@router.post("/admin/inventory/adjust")
async def adjust_stock(data: StockAdjust, _: dict = Depends(get_current_admin)):
    res = await db.products.find_one_and_update(
        {"id": data.product_id, "stock": {"$gte": -data.delta if data.delta < 0 else 0}},
        {"$inc": {"stock": data.delta}, "$set": {"updated_at": _now()}}, return_document=True)
    if not res:
        raise ApiError(409, "INSUFFICIENT_STOCK", "El ajuste dejaría el stock en negativo")
    return clean(res)
