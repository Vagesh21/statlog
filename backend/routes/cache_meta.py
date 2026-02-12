from fastapi import APIRouter, Depends
from routes.auth import get_current_user
from utils.cache_store import cache_store
from utils.collectors import (
    KEY_CPU, KEY_MEMORY, KEY_TEMP, KEY_DISK, KEY_NETWORK, KEY_SUMMARY,
    KEY_HISTORY, KEY_USB, KEY_DOCKER, KEY_DONGLE, KEY_HEALTH
)

router = APIRouter(prefix="/api/cache", tags=["cache"])

@router.get("/status")
async def cache_status(current_user: dict = Depends(get_current_user)):
    keys = [
        KEY_CPU, KEY_MEMORY, KEY_TEMP, KEY_DISK, KEY_NETWORK,
        KEY_SUMMARY, KEY_HISTORY, KEY_USB, KEY_DOCKER, KEY_DONGLE, KEY_HEALTH
    ]
    return {key: cache_store.snapshot(key)["meta"] for key in keys}
