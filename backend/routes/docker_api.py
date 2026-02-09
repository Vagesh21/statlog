from fastapi import APIRouter, Depends, HTTPException
import docker
from typing import List, Dict
from routes.auth import get_current_user
import asyncio
from functools import lru_cache
import time

router = APIRouter(prefix="/api/docker", tags=["docker"])

# Cache for 3 seconds to avoid overwhelming Docker API
cache_timeout = 3
last_cache_time = 0
cached_containers = None

def get_docker_client():
    try:
        return docker.from_env()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Docker not available: {str(e)}")

def get_container_stats(container) -> Dict:
    """Get container statistics"""
    try:
        stats = container.stats(stream=False)
        
        # Calculate CPU percentage
        cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - stats['precpu_stats']['cpu_usage']['total_usage']
        system_delta = stats['cpu_stats']['system_cpu_usage'] - stats['precpu_stats']['system_cpu_usage']
        cpu_percent = 0.0
        if system_delta > 0:
            cpu_percent = (cpu_delta / system_delta) * len(stats['cpu_stats']['cpu_usage']['percpu_usage']) * 100.0
        
        # Memory usage
        mem_usage = stats['memory_stats'].get('usage', 0)
        mem_limit = stats['memory_stats'].get('limit', 1)
        mem_percent = (mem_usage / mem_limit) * 100 if mem_limit > 0 else 0
        
        return {
            "cpu_percent": round(cpu_percent, 2),
            "memory_usage": mem_usage,
            "memory_limit": mem_limit,
            "memory_percent": round(mem_percent, 2)
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("/containers")
async def get_containers(current_user: dict = Depends(get_current_user)):
    """Get all Docker containers with their status and stats"""
    global cached_containers, last_cache_time
    
    current_time = time.time()
    if cached_containers and (current_time - last_cache_time) < cache_timeout:
        return cached_containers
    
    try:
        client = get_docker_client()
        containers = client.containers.list(all=True)
        
        container_list = []
        for container in containers:
            container_info = {
                "id": container.short_id,
                "name": container.name,
                "image": container.image.tags[0] if container.image.tags else container.image.short_id,
                "status": container.status,
                "state": container.attrs['State'],
                "ports": container.ports,
                "created": container.attrs['Created'],
            }
            
            # Get stats only for running containers
            if container.status == 'running':
                container_info['stats'] = get_container_stats(container)
            else:
                container_info['stats'] = {}
            
            container_list.append(container_info)
        
        result = {"containers": container_list}
        cached_containers = result
        last_cache_time = current_time
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching containers: {str(e)}")

@router.post("/containers/{container_id}/restart")
async def restart_container(container_id: str, current_user: dict = Depends(get_current_user)):
    """Restart a Docker container"""
    try:
        client = get_docker_client()
        container = client.containers.get(container_id)
        container.restart()
        return {"message": f"Container {container.name} restarted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error restarting container: {str(e)}")

@router.post("/containers/{container_id}/stop")
async def stop_container(container_id: str, current_user: dict = Depends(get_current_user)):
    """Stop a Docker container"""
    try:
        client = get_docker_client()
        container = client.containers.get(container_id)
        container.stop()
        return {"message": f"Container {container.name} stopped successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error stopping container: {str(e)}")

@router.post("/containers/{container_id}/start")
async def start_container(container_id: str, current_user: dict = Depends(get_current_user)):
    """Start a Docker container"""
    try:
        client = get_docker_client()
        container = client.containers.get(container_id)
        container.start()
        return {"message": f"Container {container.name} started successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting container: {str(e)}")
