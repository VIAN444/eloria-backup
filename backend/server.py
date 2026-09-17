import logging
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException
from starlette.middleware.cors import CORSMiddleware

from app.core.database import client, ensure_indexes
from app.routes import admin, auth, catalog, orders, payments
from app.seed import seed

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="ÉLORIA API")

app.include_router(auth.router)
app.include_router(catalog.router)
app.include_router(orders.router)
app.include_router(payments.router)
app.include_router(admin.router)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "message" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(status_code=exc.status_code,
                        content={"success": False, "code": "ERROR", "message": str(exc.detail)})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(p) for p in first.get("loc", []) if p not in ("body",))
    msg = f"{field}: {first.get('msg', 'Dato inválido')}" if field else "Datos inválidos"
    return JSONResponse(status_code=422,
                        content={"success": False, "code": "VALIDATION_ERROR", "message": msg})


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api")
async def root():
    return {"message": "ÉLORIA API", "status": "ok"}


@app.on_event("startup")
async def startup():
    await ensure_indexes()
    await seed()
    logger.info("ÉLORIA backend listo")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
