import os
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Request

JWT_ALGORITHM = "HS256"


class ApiError(HTTPException):
    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(status_code=status_code, detail={"success": False, "code": code, "message": message})


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str, token_version: int = 0) -> str:
    payload = {"sub": user_id, "email": email, "ver": token_version, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(minutes=15)}
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str, token_version: int = 0) -> str:
    payload = {"sub": user_id, "ver": token_version, "type": "refresh",
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response, user_id: str, email: str, token_version: int = 0):
    response.set_cookie("access_token", create_access_token(user_id, email, token_version),
                        httponly=True, secure=True, samesite="none", max_age=900, path="/")
    response.set_cookie("refresh_token", create_refresh_token(user_id, token_version),
                        httponly=True, secure=True, samesite="none", max_age=604800, path="/")


def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise ApiError(401, "TOKEN_EXPIRED", "Sesión expirada")
    except jwt.InvalidTokenError:
        raise ApiError(401, "INVALID_TOKEN", "Token inválido")


async def get_current_admin(request: Request) -> dict:
    from app.core.database import db
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise ApiError(401, "NOT_AUTHENTICATED", "No autenticado")
    payload = _decode(token)
    if payload.get("type") != "access":
        raise ApiError(401, "INVALID_TOKEN", "Token inválido")
    user = await db.users.find_one({"id": payload["sub"], "role": "admin"})
    if not user:
        raise ApiError(401, "USER_NOT_FOUND", "Usuario no encontrado")
    if payload.get("ver", 0) != user.get("token_version", 0):
        raise ApiError(401, "SESSION_EXPIRED", "Sesión expirada")
    user.pop("password_hash", None)
    user.pop("_id", None)
    return user
