from fastapi import APIRouter, Depends
from routes.auth import get_current_user
from utils.cache_store import cache_store
from utils.collectors import KEY_HEALTH

router = APIRouter(prefix="/api/health", tags=["health"])

@router.get("")
async def get_health():
    return cache_store.snapshot(KEY_HEALTH)
