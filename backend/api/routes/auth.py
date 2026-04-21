import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, Field

from services.auth_service import auth_service, get_current_user
from services.oauth_service import (
    google_auth_url,
    google_callback,
    twitter_auth_url,
    twitter_callback,
    APP_BASE_URL,
    GOOGLE_CLIENT_ID,
    TWITTER_CLIENT_ID,
)
from db.auth_models import User

logger = logging.getLogger(__name__)
router = APIRouter(tags=["auth"])


def _build_oauth_error_redirect(detail: str) -> str:
    import urllib.parse

    clean = (detail or "oauth_failed").strip()
    if not clean:
        clean = "oauth_failed"
    # Keep callback query strings concise and avoid leaking huge provider payloads.
    clean = clean[:220]
    return f"{APP_BASE_URL}/oauth-callback?error={urllib.parse.quote(clean)}"


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
        user   = auth_service.create_user(
            email     = req.email,
            username  = req.username,
            password  = req.password,
            full_name = req.full_name,
        )
        tokens = auth_service.issue_tokens(user)
        return {"message": f"Account created. Welcome, {user.username}!", **tokens}
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
        "id":           current_user.id,
        "email":        current_user.email,
        "username":     current_user.username,
        "full_name":    current_user.full_name,
        "avatar_url":   current_user.avatar_url,
        "auth_provider": current_user.auth_provider,
        "is_active":    current_user.is_active,
        "created_at":   current_user.created_at.isoformat(),
        "last_login":   current_user.last_login.isoformat() if current_user.last_login else None,
    }


@router.patch("/me/password", summary="Change password")
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
):
    if current_user.is_oauth:
        raise HTTPException(
            status_code=400,
            detail="OAuth accounts cannot set a password through this endpoint.",
        )
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


@router.get("/oauth/providers", summary="Which OAuth providers are configured")
def oauth_providers():
    return {
        "google":  bool(GOOGLE_CLIENT_ID),
        "twitter": bool(TWITTER_CLIENT_ID),
    }


@router.get("/oauth/google", summary="Start Google OAuth flow")
def google_login():
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth is not configured on this server. "
                   "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )
    try:
        url = google_auth_url()
        return RedirectResponse(url=url, status_code=302)
    except Exception as e:
        logger.exception(f"Google OAuth start failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/oauth/google/callback", summary="Google OAuth callback")
def google_oauth_callback(
    code:  str = Query(...),
    state: str = Query(...),
):
    try:
        profile = google_callback(code, state)
        user    = auth_service.get_or_create_oauth_user(profile)
        tokens  = auth_service.issue_tokens(user)

        params = {
            "access_token":  tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "user_id":       str(tokens["user"]["id"]),
            "username":      tokens["user"]["username"],
            "email":         tokens["user"]["email"],
            "avatar_url":    tokens["user"].get("avatar_url", ""),
            "auth_provider": "google",
        }
        import urllib.parse
        redirect_url = f"{APP_BASE_URL}/oauth-callback?{urllib.parse.urlencode(params)}"
        return RedirectResponse(url=redirect_url, status_code=302)
    except ValueError as e:
        logger.warning(f"Google callback failed: {e}")
        redirect_url = _build_oauth_error_redirect(str(e))
        return RedirectResponse(url=redirect_url, status_code=302)
    except Exception as e:
        logger.exception(f"Google callback error: {e}")
        redirect_url = _build_oauth_error_redirect(str(e) or "oauth_failed")
        return RedirectResponse(url=redirect_url, status_code=302)


@router.get("/oauth/twitter", summary="Start Twitter/X OAuth flow")
def twitter_login():
    if not TWITTER_CLIENT_ID:
        raise HTTPException(
            status_code=503,
            detail="Twitter OAuth is not configured on this server. "
                   "Set TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET.",
        )
    try:
        url, _verifier = twitter_auth_url()
        return RedirectResponse(url=url, status_code=302)
    except Exception as e:
        logger.exception(f"Twitter OAuth start failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/oauth/twitter/callback", summary="Twitter/X OAuth callback")
def twitter_oauth_callback(
    code:  str = Query(...),
    state: str = Query(...),
):
    try:
        profile = twitter_callback(code, state)
        user    = auth_service.get_or_create_oauth_user(profile)
        tokens  = auth_service.issue_tokens(user)

        import urllib.parse
        params = {
            "access_token":  tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "user_id":       str(tokens["user"]["id"]),
            "username":      tokens["user"]["username"],
            "email":         tokens["user"]["email"],
            "avatar_url":    tokens["user"].get("avatar_url", ""),
            "auth_provider": "twitter",
        }
        redirect_url = f"{APP_BASE_URL}/oauth-callback?{urllib.parse.urlencode(params)}"
        return RedirectResponse(url=redirect_url, status_code=302)
    except ValueError as e:
        logger.warning(f"Twitter callback failed: {e}")
        redirect_url = _build_oauth_error_redirect(str(e))
        return RedirectResponse(url=redirect_url, status_code=302)
    except Exception as e:
        logger.exception(f"Twitter callback error: {e}")
        redirect_url = _build_oauth_error_redirect(str(e) or "oauth_failed")
        return RedirectResponse(url=redirect_url, status_code=302)