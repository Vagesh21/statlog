from fastapi import APIRouter, Depends
from routes.auth import get_current_user
from utils.system_metrics import get_cpu_metrics, get_memory_metrics, get_temperature
import psutil

router = APIRouter(prefix="/api", tags=["health"])

@router.get("/health")
async def health_check():
    """Public health check endpoint"""
    cpu = get_cpu_metrics()
    mem = get_memory_metrics()
    temp = get_temperature()
    
    # Determine overall health status
    status = "healthy"
    warnings = []
    
    if cpu['overall_usage'] > 90:
        status = "warning"
        warnings.append("High CPU usage")
    
    if mem['percent'] > 90:
        status = "warning"
        warnings.append("High memory usage")
    
    if temp.get('cpu_temp', 0) > 80:
        status = "critical"
        warnings.append("Critical temperature")
    elif temp.get('cpu_temp', 0) > 70:
        if status != "critical":
            status = "warning"
        warnings.append("High temperature")
    
    return {
        "status": status,
        "warnings": warnings,
        "uptime": psutil.boot_time(),
        "cpu_usage": cpu['overall_usage'],
        "memory_usage": mem['percent'],
        "temperature": temp.get('cpu_temp', 0)
    }
