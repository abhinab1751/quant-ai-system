import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from db.auth_models import User
from db.database import SessionLocal

logger = logging.getLogger(__name__)

SECRET_KEY            = os.getenv("JWT_SECRET_KEY", "CHANGE-ME-IN-PRODUCTION-USE-openssl-rand-hex-32")
ALGORITHM             = "HS256"
ACCESS_TOKEN_MINUTES  = int(os.getenv("ACCESS_TOKEN_MINUTES",  "30"))
REFRESH_TOKEN_DAYS    = int(os.getenv("REFRESH_TOKEN_DAYS",    "7"))


def hash_password(plain: str) -> str:
    hashed = bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError, AttributeError):
        return False


def create_access_token(user_id: int, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    return jwt.encode(
        {"sub": str(user_id), "email": email, "exp": expire, "type": "access"},
        SECRET_KEY, algorithm=ALGORITHM,
    )


def create_refresh_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire, "type": "refresh"},
        SECRET_KEY, algorithm=ALGORITHM,
    )


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

class AuthService:

    def get_user_by_email(self, email: str) -> Optional[User]:
        with SessionLocal() as db:
            return db.query(User).filter(User.email == email.lower().strip()).first()

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        with SessionLocal() as db:
            return db.get(User, user_id)

    def get_user_by_username(self, username: str) -> Optional[User]:
        with SessionLocal() as db:
            return db.query(User).filter(User.username == username.lower().strip()).first()

    def create_user(self, email: str, username: str, password: str, full_name: str = "") -> User:
        email    = email.lower().strip()
        username = username.lower().strip()

        if self.get_user_by_email(email):
            raise ValueError("An account with this email already exists.")
        if self.get_user_by_username(username):
            raise ValueError("This username is already taken.")

        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters.")
        if len(username) < 3:
            raise ValueError("Username must be at least 3 characters.")

        with SessionLocal() as db:
            user = User(
                email           = email,
                username        = username,
                hashed_password = hash_password(password),
                full_name       = full_name,
                is_active       = True,
                is_verified     = True,  
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return user

    def authenticate(self, email_or_username: str, password: str) -> Optional[User]:
        val = email_or_username.lower().strip()
        with SessionLocal() as db:
            user = (
                db.query(User).filter(User.email == val).first()
                or
                db.query(User).filter(User.username == val).first()
            )
            if not user:
                return None
            if not user.is_active:
                return None
            if not verify_password(password, user.hashed_password):
                return None

            user.last_login = datetime.utcnow()
            db.commit()
            # Prevent DetachedInstanceError after session close when callers
            # access user fields to build token response.
            db.refresh(user)
            db.expunge(user)
            return user

    def issue_tokens(self, user: User) -> dict:
        return {
            "access_token":  create_access_token(user.id, user.email),
            "refresh_token": create_refresh_token(user.id),
            "token_type":    "bearer",
            "user": {
                "id":        user.id,
                "email":     user.email,
                "username":  user.username,
                "full_name": user.full_name,
            },
        }

    def refresh_access_token(self, refresh_token: str) -> dict:
        try:
            payload = decode_token(refresh_token)
        except JWTError:
            raise ValueError("Invalid or expired refresh token.")

        if payload.get("type") != "refresh":
            raise ValueError("Token is not a refresh token.")

        user = self.get_user_by_id(int(payload["sub"]))
        if not user or not user.is_active:
            raise ValueError("User not found or deactivated.")

        return {
            "access_token": create_access_token(user.id, user.email),
            "token_type":   "bearer",
        }

    def change_password(self, user_id: int, old_password: str, new_password: str) -> bool:
        user = self.get_user_by_id(user_id)
        if not user or not verify_password(old_password, user.hashed_password):
            return False
        if len(new_password) < 8:
            raise ValueError("Password must be at least 8 characters.")
        with SessionLocal() as db:
            u = db.get(User, user_id)
            u.hashed_password = hash_password(new_password)
            db.commit()
        return True

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
auth_service  = AuthService()


def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    cred_exc = HTTPException(
        status_code = status.HTTP_401_UNAUTHORIZED,
        detail      = "Could not validate credentials. Please log in again.",
        headers     = {"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise cred_exc
        user_id = int(payload["sub"])
    except (JWTError, ValueError, KeyError):
        raise cred_exc

    user = auth_service.get_user_by_id(user_id)
    if not user or not user.is_active:
        raise cred_exc
    return user


def get_current_user_optional(token: str = Depends(oauth2_scheme)) -> Optional[User]:
    try:
        return get_current_user(token)
    except HTTPException:
        return None