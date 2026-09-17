import hashlib
import logging
import os
import secrets
from datetime import datetime, timezone, timedelta
from html import escape
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response

from app.core.database import db
from app.core.security import (ApiError, create_access_token, get_current_admin,
                               hash_password, set_auth_cookies, verify_password)
from app.schemas import ForgotPasswordIn, LoginIn, ResetPasswordIn

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])

EMAIL_BASE_URL = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip().rstrip("/") or "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME") or "ÉLORIA"

LOCKOUT_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


async def send_password_reset_email(to_email: str, token: str) -> bool:
    base = os.environ.get("FRONTEND_URL", "").rstrip("/")
    link = f"{base}/admin/reset-password?token={token}"
    if not EMAIL_KEY or EMAIL_KEY.startswith("{") or not base.startswith("https://"):
        if urlparse(base).hostname in ("localhost", "127.0.0.1", "::1"):
            logger.warning("Email not configured; password reset link: %s", link)
        else:
            logger.error("Password reset email not configured (EMERGENT_EMAIL_KEY / FRONTEND_URL)")
        return False
    brand = escape(EMAIL_FROM_NAME)
    html = (
        f'<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif">'
        f'<p>Recibimos una solicitud para restablecer tu contraseña de {brand}.</p>'
        f'<p><a href="{escape(link)}">Restablecer contraseña</a></p>'
        f'<p>Este enlace expira en 1 hora y solo puede usarse una vez. Si no lo solicitaste, ignora este correo.</p>'
        f'<p style="font-size:12px;color:#888">Enviado por {brand}. Nunca pedimos tu contraseña por correo.</p>'
        f'</td></tr></table>'
    )
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json={"to": [to_email], "subject": f"Restablece tu contraseña de {EMAIL_FROM_NAME}",
                      "html": html, "from_name": EMAIL_FROM_NAME})
        resp.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Password reset email failed: {e}")
        return False


@router.post("/login")
async def login(data: LoginIn, request: Request, response: Response):
    email = data.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=LOCKOUT_MINUTES)
    fails = await db.login_attempts.count_documents({"identifier": identifier, "created_at": {"$gt": cutoff.isoformat()}})
    if fails >= LOCKOUT_ATTEMPTS:
        raise ApiError(429, "ACCOUNT_LOCKED", "Demasiados intentos. Intenta de nuevo en 15 minutos.")
    user = await db.users.find_one({"email": email, "role": "admin"})
    if not user or not verify_password(data.password, user["password_hash"]):
        await db.login_attempts.insert_one({"identifier": identifier, "email": email,
                                            "created_at": datetime.now(timezone.utc).isoformat()})
        raise ApiError(401, "INVALID_CREDENTIALS", "Correo o contraseña incorrectos")
    await db.login_attempts.delete_many({"identifier": identifier})
    set_auth_cookies(response, user["id"], email, user.get("token_version", 0))
    return {"id": user["id"], "email": email, "name": user.get("name", "Admin"), "role": "admin"}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"success": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_admin)):
    return {"id": user["id"], "email": user["email"], "name": user.get("name", "Admin"), "role": "admin"}


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    import jwt as pyjwt
    token = request.cookies.get("refresh_token")
    if not token:
        raise ApiError(401, "NOT_AUTHENTICATED", "No autenticado")
    try:
        payload = pyjwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
    except pyjwt.InvalidTokenError:
        raise ApiError(401, "INVALID_TOKEN", "Token inválido")
    if payload.get("type") != "refresh":
        raise ApiError(401, "INVALID_TOKEN", "Token inválido")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user or payload.get("ver", 0) != user.get("token_version", 0):
        raise ApiError(401, "SESSION_EXPIRED", "Sesión expirada")
    response.set_cookie("access_token", create_access_token(user["id"], user["email"], user.get("token_version", 0)),
                        httponly=True, secure=True, samesite="none", max_age=900, path="/")
    return {"success": True}


GENERIC_RESET = {"message": "Si ese correo está registrado, se ha enviado un enlace de restablecimiento."}


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordIn, background_tasks: BackgroundTasks):
    email = data.email.lower()
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=15)
    if await db.password_reset_requests.count_documents({"email": email, "created_at": {"$gt": cutoff.isoformat()}}) >= 5:
        return GENERIC_RESET
    await db.password_reset_requests.insert_one({"email": email, "created_at": datetime.now(timezone.utc).isoformat()})
    user = await db.users.find_one({"email": email, "role": "admin"})
    if not user:
        return GENERIC_RESET
    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({
        "token_hash": hashlib.sha256(token.encode()).hexdigest(),
        "user_id": user["id"], "email": user["email"], "used": False,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1)})
    background_tasks.add_task(send_password_reset_email, user["email"], token)
    return GENERIC_RESET


@router.post("/reset-password")
async def reset_password(data: ResetPasswordIn):
    token_hash = hashlib.sha256(data.token.encode()).hexdigest()
    doc = await db.password_reset_tokens.find_one_and_update(
        {"token_hash": token_hash, "used": False, "expires_at": {"$gt": datetime.now(timezone.utc)}},
        {"$set": {"used": True}})
    if not doc:
        raise ApiError(400, "INVALID_RESET_TOKEN", "El enlace es inválido o ha expirado")
    await db.users.update_one({"id": doc["user_id"]},
                              {"$set": {"password_hash": hash_password(data.password)},
                               "$inc": {"token_version": 1}})
    await db.password_reset_tokens.delete_many({"user_id": doc["user_id"], "used": False})
    await db.login_attempts.delete_many({"email": doc["email"]})
    return {"success": True, "message": "Contraseña actualizada correctamente"}
