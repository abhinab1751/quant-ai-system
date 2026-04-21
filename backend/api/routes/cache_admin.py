from fastapi import APIRouter, Depends, HTTPException
from services.auth_service import get_current_user
from core.cache import cache
from db.auth_models import User

router = APIRouter(tags=["cache"])


@router.get("/health", summary="Cache health check")
def cache_health():
    ok = cache.ping()
    return {
        "status": "ok" if ok else "degraded",
        "mode":   cache._mode,
        "ping":   ok,
    }


@router.get("/stats", summary="Cache statistics")
def cache_stats(current_user: User = Depends(get_current_user)):
    return {
        "mode":  cache._mode,
        "info":  cache.info(),
    }


@router.delete("/symbol/{symbol}", summary="Invalidate all cache for a symbol")
def invalidate_symbol(
    symbol: str,
    current_user: User = Depends(get_current_user),
):
    deleted = cache.invalidate_symbol(symbol)
    return {"symbol": symbol.upper(), "keys_deleted": deleted}


@router.delete("/key/{key:path}", summary="Delete a specific cache key")
def invalidate_key(
    key: str,
    current_user: User = Depends(get_current_user),
):
    cache.delete(key)
    return {"key": key, "deleted": True}