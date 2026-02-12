from fastapi import APIRouter, Depends
from routes.auth import get_current_user
from utils.cache_store import cache_store
from utils.collectors import KEY_USB

router = APIRouter(prefix="/api/usb", tags=["usb"])

@router.get("/devices")
async def get_usb_devices(current_user: dict = Depends(get_current_user)):
    """Get all connected USB devices from cache"""
    return cache_store.snapshot(KEY_USB)
