from fastapi import APIRouter, Depends, HTTPException
from routes.auth import get_current_user
from utils.cache_store import cache_store
from utils.collectors import KEY_DOCKER

import docker

router = APIRouter(prefix="/api/docker", tags=["docker"])


def get_docker_client():
    try:
        return docker.from_env()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Docker not available: {str(e)}")


@router.get("/containers")
async def get_containers(current_user: dict = Depends(get_current_user)):
    """Get all Docker containers with their status and stats from cache"""
    return cache_store.snapshot(KEY_DOCKER)


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
