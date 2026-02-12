from fastapi import APIRouter, Depends
from routes.auth import get_current_user
from utils.cache_store import cache_store
from utils.collectors import (
    KEY_CPU, KEY_MEMORY, KEY_TEMP, KEY_DISK, KEY_NETWORK, KEY_SUMMARY, KEY_HISTORY
)

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


def _cached_or_empty(key: str):
    snapshot = cache_store.snapshot(key)
    return {
        "data": snapshot["data"],
        "meta": snapshot["meta"],
    }


@router.get("/cpu")
async def cpu_metrics(current_user: dict = Depends(get_current_user)):
    return _cached_or_empty(KEY_CPU)


@router.get("/memory")
async def memory_metrics(current_user: dict = Depends(get_current_user)):
    return _cached_or_empty(KEY_MEMORY)


@router.get("/temperature")
async def temperature_metrics(current_user: dict = Depends(get_current_user)):
    return _cached_or_empty(KEY_TEMP)


@router.get("/disk")
async def disk_metrics(current_user: dict = Depends(get_current_user)):
    return _cached_or_empty(KEY_DISK)


@router.get("/network")
async def network_metrics(current_user: dict = Depends(get_current_user)):
    return _cached_or_empty(KEY_NETWORK)


@router.get("/summary")
async def summary_metrics(current_user: dict = Depends(get_current_user)):
    return _cached_or_empty(KEY_SUMMARY)


@router.get("/history")
async def history_metrics(current_user: dict = Depends(get_current_user)):
    return _cached_or_empty(KEY_HISTORY)
