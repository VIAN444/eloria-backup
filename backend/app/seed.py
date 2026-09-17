import os
import uuid
from datetime import datetime, timezone

from app.core.database import db
from app.core.security import hash_password, verify_password


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


CATEGORIES = [
    ("Amaderada", "Maderas nobles, cedro y sándalo."),
    ("Floral", "Flores blancas, rosa y jazmín."),
    ("Cítrica", "Bergamota, neroli y toronja."),
    ("Oriental", "Ámbar, especias y resinas."),
    ("Gourmand", "Vainilla, cacao y dulces."),
    ("Cuero", "Cuero, tabaco y humo."),
]

PRODUCTS = [
    ("Ámbar Silvestre", 2450, "Oriental", 12, True,
     "https://images.unsplash.com/photo-1622618991746-fe6004db3a47?crop=entropy&cs=srgb&fm=jpg&q=85",
     "Un ámbar cálido y envolvente con resinas mexicanas.",
     {"salida": "Bergamota, pimienta rosa", "corazon": "Ámbar gris, labdanum", "fondo": "Vainilla, almizcle"}),
    ("Neroli & Copal Blanco", 2850, "Cítrica", 8, True,
     "https://images.unsplash.com/photo-1458538977777-0549b2370168?crop=entropy&cs=srgb&fm=jpg&q=85",
     "Neroli luminoso sobre copal blanco sagrado.",
     {"salida": "Neroli, toronja", "corazon": "Copal blanco, azahar", "fondo": "Cedro blanco, almizcle"}),
    ("Santal & Vainilla de Papantla", 3200, "Amaderada", 10, True,
     "https://images.unsplash.com/photo-1543422655-ac1c6ca993ed?crop=entropy&cs=srgb&fm=jpg&q=85",
     "Sándalo cremoso con vainilla auténtica de Papantla.",
     {"salida": "Cardamomo, bergamota", "corazon": "Sándalo, iris", "fondo": "Vainilla de Papantla, haba tonka"}),
    ("Edición Dual Nocturna", 4800, "Oriental", 4, True,
     "https://images.pexels.com/photos/13875783/pexels-photo-13875783.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
     "Dúo escultural de edición coleccionista, día y noche.",
     {"salida": "Azafrán, pimienta negra", "corazon": "Rosa de Damasco, oud", "fondo": "Ámbar, cuero suave"}),
    ("Cuero Negro & Humo Sagrado", 3450, "Cuero", 6, False,
     "https://images.pexels.com/photos/12456259/pexels-photo-12456259.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
     "Cuero oaxaqueño con humo de mezquite y tabaco.",
     {"salida": "Humo de mezquite, clavo", "corazon": "Cuero negro, tabaco", "fondo": "Vetiver, pachulí"}),
    ("Rosa Centifolia & Pimienta", 2650, "Floral", 15, False,
     "https://images.unsplash.com/photo-1610113233329-1c73b6f7fe98?crop=entropy&cs=srgb&fm=jpg&q=85",
     "Rosa centifolia fresca con un giro especiado.",
     {"salida": "Pimienta rosa, lichi", "corazon": "Rosa centifolia, peonía", "fondo": "Almizcle blanco, cedro"}),
]

PICKUP_POINTS = [
    ("Boutique Polanco", "Av. Horacio 123, Polanco", "Ciudad de México"),
    ("Concept Store Roma Norte", "Colima 214, Roma Norte", "Ciudad de México"),
    ("Galería San Pedro", "Calzada del Valle 400, San Pedro Garza García", "Monterrey"),
    ("Atelier Providencia", "Av. Terranova 88, Providencia", "Guadalajara"),
]


async def seed():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@eloria.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Eloria2026!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": admin_email, "name": "Administrador",
            "role": "admin", "password_hash": hash_password(admin_password),
            "token_version": 0, "created_at": _now()})
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password)}})

    await db.store_settings.update_one({"id": "store"}, {"$setOnInsert": {
        "id": "store", "store_name": "ÉLORIA", "whatsapp_number": "5215500000000",
        "bank_name": "Banorte", "bank_account_holder": "ÉLORIA Perfumería S.A. de C.V.",
        "bank_clabe": "072580012345678901", "bank_account_number": "0123456789",
        "shipping_enabled": True, "pickup_enabled": True, "shipping_cost": 149.0,
        "created_at": _now()}}, upsert=True)

    for code, name, cost in [("pickup", "Punto de Encuentro", 0.0),
                             ("home_delivery", "Envío a Domicilio", 149.0)]:
        await db.delivery_methods.update_one({"code": code},
            {"$setOnInsert": {"code": code, "name": name, "cost": cost,
                              "enabled": True, "created_at": _now()}}, upsert=True)

    for name, address, city in PICKUP_POINTS:
        await db.pickup_points.update_one({"name": name},
            {"$setOnInsert": {"id": str(uuid.uuid4()), "name": name, "address": address,
                              "city": city, "enabled": True, "created_at": _now()}}, upsert=True)

    cat_ids = {}
    for name, desc in CATEGORIES:
        slug = name.lower().replace("í", "i")
        doc = await db.categories.find_one_and_update({"name": name},
            {"$setOnInsert": {"id": str(uuid.uuid4()), "name": name, "slug": slug,
                              "description": desc, "created_at": _now()}},
            upsert=True, return_document=True)
        cat_ids[name] = doc["id"]

    for name, price, cat, stock, featured, image, desc, notes in PRODUCTS:
        await db.products.update_one({"name": name}, {"$setOnInsert": {
            "id": str(uuid.uuid4()), "name": name, "slug": name.lower().replace(" ", "-").replace("&", "y"),
            "description": desc, "price": float(price), "category_id": cat_ids[cat],
            "images": [image], "stock": stock, "low_stock_threshold": 3,
            "featured": featured, "active": True, "notes": notes,
            "created_at": _now(), "updated_at": _now()}}, upsert=True)
