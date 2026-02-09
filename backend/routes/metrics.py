from fastapi import APIRouter, Depends
from utils.system_metrics import (
    get_cpu_metrics,
    get_memory_metrics,
    get_temperature,
    get_disk_metrics,
    get_network_metrics
)
from routes.auth import get_current_user

router = APIRouter(prefix="/api/metrics", tags=["metrics"])

@router.get("/cpu")
async def cpu_metrics(current_user: dict = Depends(get_current_user)):
    return get_cpu_metrics()

@router.get("/memory")
async def memory_metrics(current_user: dict = Depends(get_current_user)):
    return get_memory_metrics()

@router.get("/temperature")
async def temperature_metrics(current_user: dict = Depends(get_current_user)):
    return get_temperature()

@router.get("/disk")
async def disk_metrics(current_user: dict = Depends(get_current_user)):
    return get_disk_metrics()

@router.get("/network")
async def network_metrics(current_user: dict = Depends(get_current_user)):
    return get_network_metrics()

@router.get("/all")
async def all_metrics(current_user: dict = Depends(get_current_user)):
    """Get all system metrics in one call for efficiency"""
    return {
        "cpu": get_cpu_metrics(),
        "memory": get_memory_metrics(),
        "temperature": get_temperature(),
        "disk": get_disk_metrics(),
        "network": get_network_metrics()
    }
