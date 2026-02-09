from fastapi import APIRouter, Depends, HTTPException
from routes.auth import get_current_user
from models.settings import AppSettings, ServiceLink, SMTPSettings, APIKeys
from utils.database import get_database
from typing import List

router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("/")
async def get_settings(current_user: dict = Depends(get_current_user)):
    """Get application settings"""
    db = get_database()
    settings = await db.settings.find_one()
    
    if not settings:
        # Return default settings
        default_settings = AppSettings(
            service_links=[
                ServiceLink(name="Jellyfin", url="http://localhost:8096", icon="🎬", container_name="jellyfin"),
                ServiceLink(name="Portainer", url="http://localhost:9000", icon="🐳", container_name="portainer"),
                ServiceLink(name="qBittorrent", url="http://localhost:8080", icon="📥", container_name="qbittorrent"),
                ServiceLink(name="Uptime Kuma", url="http://localhost:3001", icon="📊", container_name="uptime-kuma"),
                ServiceLink(name="Home Assistant", url="http://localhost:8123", icon="🏠", container_name="homeassistant"),
                ServiceLink(name="Immich", url="http://localhost:2283", icon="📷", container_name="immich"),
                ServiceLink(name="Homebridge", url="http://localhost:8581", icon="🌉", container_name="homebridge"),
            ]
        )
        return default_settings.dict()
    
    return settings

@router.put("/")
async def update_settings(settings: AppSettings, current_user: dict = Depends(get_current_user)):
    """Update application settings"""
    db = get_database()
    
    settings_dict = settings.dict()
    
    # Update or insert
    await db.settings.update_one(
        {},
        {"$set": settings_dict},
        upsert=True
    )
    
    return {"message": "Settings updated successfully"}

@router.post("/service-links")
async def add_service_link(service: ServiceLink, current_user: dict = Depends(get_current_user)):
    """Add a new service link"""
    db = get_database()
    settings = await db.settings.find_one()
    
    if not settings:
        settings = AppSettings().dict()
    
    service_links = settings.get('service_links', [])
    service_links.append(service.dict())
    
    await db.settings.update_one(
        {},
        {"$set": {"service_links": service_links}},
        upsert=True
    )
    
    return {"message": "Service link added successfully"}

@router.put("/service-links/{service_id}")
async def update_service_link(service_id: str, service: ServiceLink, current_user: dict = Depends(get_current_user)):
    """Update a service link"""
    db = get_database()
    settings = await db.settings.find_one()
    
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    service_links = settings.get('service_links', [])
    updated = False
    
    for i, link in enumerate(service_links):
        if link.get('id') == service_id:
            service_links[i] = service.dict()
            updated = True
            break
    
    if not updated:
        raise HTTPException(status_code=404, detail="Service link not found")
    
    await db.settings.update_one(
        {},
        {"$set": {"service_links": service_links}}
    )
    
    return {"message": "Service link updated successfully"}

@router.delete("/service-links/{service_id}")
async def delete_service_link(service_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a service link"""
    db = get_database()
    settings = await db.settings.find_one()
    
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    service_links = settings.get('service_links', [])
    service_links = [link for link in service_links if link.get('id') != service_id]
    
    await db.settings.update_one(
        {},
        {"$set": {"service_links": service_links}}
    )
    
    return {"message": "Service link deleted successfully"}

@router.put("/smtp")
async def update_smtp_settings(smtp: SMTPSettings, current_user: dict = Depends(get_current_user)):
    """Update SMTP settings"""
    db = get_database()
    
    await db.settings.update_one(
        {},
        {"$set": {"smtp_settings": smtp.dict()}},
        upsert=True
    )
    
    return {"message": "SMTP settings updated successfully"}

@router.put("/api-keys")
async def update_api_keys(api_keys: APIKeys, current_user: dict = Depends(get_current_user)):
    """Update API keys"""
    db = get_database()
    
    await db.settings.update_one(
        {},
        {"$set": {"api_keys": api_keys.dict()}},
        upsert=True
    )
    
    return {"message": "API keys updated successfully"}
