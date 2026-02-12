from fastapi import APIRouter, Depends, HTTPException
from routes.auth import get_current_user
from utils.cache_store import cache_store
from utils.collectors import KEY_DONGLE
import os

try:
    from huawei_lte_api.Client import Client
    from huawei_lte_api.Connection import Connection
    from huawei_lte_api.enums.sms import BoxTypeEnum
    HUAWEI_API_AVAILABLE = True
except ImportError:
    HUAWEI_API_AVAILABLE = False

router = APIRouter(prefix="/api/dongle", tags=["dongle"])

@router.get("/status")
async def dongle_status(current_user: dict = Depends(get_current_user)):
    """Get dongle status from cache"""
    return cache_store.snapshot(KEY_DONGLE)


@router.post("/sms/{message_index}/delete")
async def delete_sms(message_index: int, current_user: dict = Depends(get_current_user)):
    """Delete an SMS message"""
    if not HUAWEI_API_AVAILABLE:
        raise HTTPException(status_code=500, detail="Huawei LTE API not available")

    modem_ip = os.getenv('MODEM_IP', '192.168.8.1')
    try:
        with Connection(f'http://{modem_ip}/') as connection:
            client = Client(connection)
            client.sms.delete_sms(message_index)
        return {"message": "SMS deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting SMS: {str(e)}")
