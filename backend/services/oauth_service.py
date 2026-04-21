from __future__ import annotations

import base64
import hashlib
import logging
import os
import secrets
import urllib.parse
from typing import Optional

import requests

logger = logging.getLogger(__name__)

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI  = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "http://localhost:8000/auth/oauth/google/callback",
)

TWITTER_CLIENT_ID     = os.getenv("TWITTER_CLIENT_ID", "")
TWITTER_CLIENT_SECRET = os.getenv("TWITTER_CLIENT_SECRET", "")
TWITTER_REDIRECT_URI  = os.getenv(
    "TWITTER_REDIRECT_URI",
    "http://localhost:8000/auth/oauth/twitter/callback",
)

APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:5173")

GOOGLE_AUTH_URL    = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL   = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO    = "https://www.googleapis.com/oauth2/v3/userinfo"

TWITTER_AUTH_URL   = "https://twitter.com/i/oauth2/authorize"
TWITTER_TOKEN_URL  = "https://api.twitter.com/2/oauth2/token"
TWITTER_USERINFO   = "https://api.twitter.com/2/users/me"


def _pkce_pair() -> tuple[str, str]:
    verifier  = secrets.token_urlsafe(64)
    digest    = hashlib.sha256(verifier.encode()).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return verifier, challenge

_state_store: dict[str, dict] = {}


def _new_state(provider: str, verifier: Optional[str] = None) -> str:
    state = secrets.token_urlsafe(32)
    _state_store[state] = {"provider": provider, "verifier": verifier}
    return state


def _pop_state(state: str) -> Optional[dict]:
    return _state_store.pop(state, None)


def google_auth_url() -> str:
    if not GOOGLE_CLIENT_ID:
        raise ValueError("GOOGLE_CLIENT_ID is not configured")

    state  = _new_state("google")
    params = {
        "client_id":     GOOGLE_CLIENT_ID,
        "redirect_uri":  GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope":         "openid email profile",
        "state":         state,
        "access_type":   "offline",
        "prompt":        "select_account",
    }
    return f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"


def google_callback(code: str, state: str) -> dict:
    stored = _pop_state(state)
    if not stored or stored["provider"] != "google":
        raise ValueError("Invalid or expired OAuth state")

    token_resp = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "code":          code,
            "client_id":     GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri":  GOOGLE_REDIRECT_URI,
            "grant_type":    "authorization_code",
        },
        timeout=10,
    )
    token_resp.raise_for_status()
    token_data = token_resp.json()
    access_token = token_data.get("access_token")

    user_resp = requests.get(
        GOOGLE_USERINFO,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    user_resp.raise_for_status()
    info = user_resp.json()

    return {
        "provider":    "google",
        "provider_id": info.get("sub"),
        "email":       info.get("email", ""),
        "name":        info.get("name", ""),
        "avatar_url":  info.get("picture", ""),
        "email_verified": info.get("email_verified", False),
    }



def twitter_auth_url() -> tuple[str, str]:
    if not TWITTER_CLIENT_ID:
        raise ValueError("TWITTER_CLIENT_ID is not configured")

    verifier, challenge = _pkce_pair()
    state = _new_state("twitter", verifier=verifier)

    params = {
        "response_type":         "code",
        "client_id":             TWITTER_CLIENT_ID,
        "redirect_uri":          TWITTER_REDIRECT_URI,
        "scope":                 "tweet.read users.read offline.access",
        "state":                 state,
        "code_challenge":        challenge,
        "code_challenge_method": "S256",
    }
    url = f"{TWITTER_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return url, verifier


def twitter_callback(code: str, state: str) -> dict:
    stored = _pop_state(state)
    if not stored or stored["provider"] != "twitter":
        raise ValueError("Invalid or expired OAuth state")

    verifier = stored.get("verifier")
    if not verifier:
        raise ValueError("PKCE verifier missing for Twitter callback")

    creds = base64.b64encode(
        f"{TWITTER_CLIENT_ID}:{TWITTER_CLIENT_SECRET}".encode()
    ).decode()

    token_resp = requests.post(
        TWITTER_TOKEN_URL,
        headers={
            "Authorization": f"Basic {creds}",
            "Content-Type":  "application/x-www-form-urlencoded",
        },
        data={
            "code":          code,
            "grant_type":    "authorization_code",
            "redirect_uri":  TWITTER_REDIRECT_URI,
            "code_verifier": verifier,
            "client_id":     TWITTER_CLIENT_ID,
        },
        timeout=10,
    )
    try:
        token_resp.raise_for_status()
    except requests.HTTPError as exc:
        detail = "Twitter token exchange failed"
        try:
            body = token_resp.json()
            detail = body.get("error_description") or body.get("error") or detail
        except Exception:
            text_body = (token_resp.text or "").strip()
            if text_body:
                detail = f"{detail}: {text_body[:200]}"
        raise ValueError(detail) from exc

    token_data   = token_resp.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise ValueError("Twitter token exchange failed: missing access token")

    user_resp = requests.get(
        f"{TWITTER_USERINFO}?user.fields=id,name,username,profile_image_url,verified",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    try:
        user_resp.raise_for_status()
    except requests.HTTPError as exc:
        detail = "Twitter user profile fetch failed"
        try:
            body = user_resp.json()
            if isinstance(body, dict):
                errs = body.get("errors")
                if errs and isinstance(errs, list) and errs[0].get("detail"):
                    detail = errs[0]["detail"]
                else:
                    detail = body.get("detail") or body.get("title") or detail
        except Exception:
            text_body = (user_resp.text or "").strip()
            if text_body:
                detail = f"{detail}: {text_body[:200]}"
        raise ValueError(detail) from exc

    info = user_resp.json().get("data", {})

    provider_id = info.get("id", "")
    email_placeholder = f"twitter_{provider_id}@oauth.quantai"

    return {
        "provider":    "twitter",
        "provider_id": provider_id,
        "email":       email_placeholder,
        "name":        info.get("name", ""),
        "username":    info.get("username", ""),
        "avatar_url":  info.get("profile_image_url", ""),
        "email_verified": False,
    }