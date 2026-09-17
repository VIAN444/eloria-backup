import os
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]


async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.products.create_index("slug", unique=True, sparse=True)
    await db.products.create_index("category_id")
    await db.categories.create_index("slug", unique=True, sparse=True)
    await db.orders.create_index("id", unique=True)
    await db.orders.create_index("folio", unique=True)
    await db.orders.create_index("customer.email")
    await db.payment_transactions.create_index("session_id", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.login_attempts.create_index("email")
    await db.password_reset_tokens.create_index("token_hash", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.password_reset_requests.create_index("email")
    await db.password_reset_requests.create_index("created_at", expireAfterSeconds=900)
