import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr, Field

from services.auth_service import auth_service, get_current_user
from db.auth_models import User

logger = logging.getLogger(__name__)
router = APIRouter(tags=["auth"])


class SignupRequest(BaseModel):
    email:     EmailStr
    username:  str       = Field(..., min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_]+$")
    password:  str       = Field(..., min_length=8)
    full_name: str       = Field("", max_length=120)

class LoginRequest(BaseModel):
    email_or_username: str = Field(..., min_length=1)
    password:          str = Field(..., min_length=1)

class RefreshRequest(BaseModel):
    refresh_token: str

class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)


@router.post("/signup", status_code=status.HTTP_201_CREATED, summary="Create a new account")
def signup(req: SignupRequest):
    try:
        user = auth_service.create_user(
            email     = req.email,
            username  = req.username,
            password  = req.password,
            full_name = req.full_name,
        )
        tokens = auth_service.issue_tokens(user)
        return {
            "message": f"Account created. Welcome, {user.username}!",
            **tokens,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Signup failed: {e}")
        raise HTTPException(status_code=500, detail="Account creation failed. Please try again.")


@router.post("/login", summary="Log in and receive JWT tokens")
def login(req: LoginRequest):
    try:
        user = auth_service.authenticate(req.email_or_username, req.password)
        if not user:
            raise HTTPException(
                status_code = status.HTTP_401_UNAUTHORIZED,
                detail      = "Invalid email/username or password.",
            )
        return auth_service.issue_tokens(user)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Login failed: {e}")
        raise HTTPException(status_code=500, detail="Login failed. Please try again.")


@router.post("/refresh", summary="Get a new access token using a refresh token")
def refresh(req: RefreshRequest):
    try:
        return auth_service.refresh_access_token(req.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.get("/me", summary="Get current user profile")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id":         current_user.id,
        "email":      current_user.email,
        "username":   current_user.username,
        "full_name":  current_user.full_name,
        "is_active":  current_user.is_active,
        "created_at": current_user.created_at.isoformat(),
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None,
    }


@router.patch("/me/password", summary="Change password")
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        ok = auth_service.change_password(current_user.id, req.old_password, req.new_password)
        if not ok:
            raise HTTPException(status_code=400, detail="Old password is incorrect.")
        return {"message": "Password changed successfully."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/logout", summary="Log out (client-side token discard hint)")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Logged out. Discard your tokens."}