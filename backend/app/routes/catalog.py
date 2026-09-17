import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.database import db
from app.core.security import ApiError, get_current_admin
from app.schemas import CategoryIn, ProductIn

router = APIRouter(prefix="/api", tags=["catalog"])


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[áàä]", "a", text); text = re.sub(r"[éèë]", "e", text)
    text = re.sub(r"[íìï]", "i", text); text = re.sub(r"[óòö]", "o", text)
    text = re.sub(r"[úùü]", "u", text); text = re.sub(r"ñ", "n", text)
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")


def clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


@router.get("/products")
async def list_products(category: Optional[str] = None, q: Optional[str] = None,
                        featured: Optional[bool] = None, include_inactive: bool = False):
    filt = {} if include_inactive else {"active": True}
    if category:
        cat = await db.categories.find_one({"$or": [{"id": category}, {"slug": category}]})
        filt["category_id"] = cat["id"] if cat else category
    if q:
        filt["name"] = {"$regex": re.escape(q), "$options": "i"}
    if featured is not None:
        filt["featured"] = featured
    products = await db.products.find(filt).sort("created_at", -1).to_list(500)
    cats = {c["id"]: c for c in await db.categories.find().to_list(200)}
    out = []
    for p in products:
        clean(p)
        cat = cats.get(p.get("category_id"))
        p["category"] = {"id": cat["id"], "name": cat["name"], "slug": cat["slug"]} if cat else None
        out.append(p)
    return out


@router.get("/products/{product_id}")
async def get_product(product_id: str):
    prod = await db.products.find_one({"$or": [{"id": product_id}, {"slug": product_id}]})
    if not prod:
        raise ApiError(404, "PRODUCT_NOT_FOUND", "Producto no encontrado")
    clean(prod)
    cat = await db.categories.find_one({"id": prod.get("category_id")})
    prod["category"] = {"id": cat["id"], "name": cat["name"], "slug": cat["slug"]} if cat else None
    return prod


@router.post("/products", status_code=201)
async def create_product(data: ProductIn, _: dict = Depends(get_current_admin)):
    now = datetime.now(timezone.utc).isoformat()
    slug = slugify(data.name)
    if await db.products.find_one({"slug": slug}):
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"
    doc = {**data.model_dump(), "id": str(uuid.uuid4()), "slug": slug,
           "created_at": now, "updated_at": now}
    await db.products.insert_one(doc)
    return clean(doc)


@router.put("/products/{product_id}")
async def update_product(product_id: str, data: ProductIn, _: dict = Depends(get_current_admin)):
    res = await db.products.update_one({"id": product_id},
        {"$set": {**data.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}})
    if not res.matched_count:
        raise ApiError(404, "PRODUCT_NOT_FOUND", "Producto no encontrado")
    return clean(await db.products.find_one({"id": product_id}))


@router.delete("/products/{product_id}")
async def delete_product(product_id: str, _: dict = Depends(get_current_admin)):
    res = await db.products.delete_one({"id": product_id})
    if not res.deleted_count:
        raise ApiError(404, "PRODUCT_NOT_FOUND", "Producto no encontrado")
    return {"success": True}


@router.get("/categories")
async def list_categories():
    cats = await db.categories.find().sort("name", 1).to_list(200)
    for c in cats:
        clean(c)
        c["product_count"] = await db.products.count_documents({"category_id": c["id"], "active": True})
    return cats


@router.post("/categories", status_code=201)
async def create_category(data: CategoryIn, _: dict = Depends(get_current_admin)):
    slug = slugify(data.name)
    if await db.categories.find_one({"slug": slug}):
        raise ApiError(409, "CATEGORY_EXISTS", "Ya existe una categoría con ese nombre")
    doc = {**data.model_dump(), "id": str(uuid.uuid4()), "slug": slug,
           "created_at": datetime.now(timezone.utc).isoformat()}
    await db.categories.insert_one(doc)
    return clean(doc)


@router.put("/categories/{category_id}")
async def update_category(category_id: str, data: CategoryIn, _: dict = Depends(get_current_admin)):
    res = await db.categories.update_one({"id": category_id}, {"$set": data.model_dump()})
    if not res.matched_count:
        raise ApiError(404, "CATEGORY_NOT_FOUND", "Categoría no encontrada")
    return clean(await db.categories.find_one({"id": category_id}))


@router.delete("/categories/{category_id}")
async def delete_category(category_id: str, _: dict = Depends(get_current_admin)):
    if await db.products.count_documents({"category_id": category_id}):
        raise ApiError(409, "CATEGORY_IN_USE", "La categoría tiene productos asignados")
    res = await db.categories.delete_one({"id": category_id})
    if not res.deleted_count:
        raise ApiError(404, "CATEGORY_NOT_FOUND", "Categoría no encontrada")
    return {"success": True}
