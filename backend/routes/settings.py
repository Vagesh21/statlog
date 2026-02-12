from fastapi import APIRouter, Depends, HTTPException
from routes.auth import get_current_user
from models.settings import AppSettings, ServiceLink, SMTPSettings, APIKeys
from utils.database import get_database
from utils.users import is_admin
from utils.smtp_mailer import smtp_is_configured, send_email_sync
from utils.cache_store import cache_store
from utils.collectors import KEY_SMS_FORWARDER
from typing import List
from urllib.parse import urlparse, urlunparse
from pydantic import BaseModel
import asyncio
from datetime import datetime
from zoneinfo import ZoneInfo


def _strip_id(doc: dict) -> dict:
    if not doc:
        return doc
    doc = {k: v for k, v in doc.items() if k != '_id'}
    return doc

router = APIRouter(prefix="/api/settings", tags=["settings"])

class SMTPTestRequest(BaseModel):
    to_email: str = ""
    subject: str = "Pi Monitor SMTP Test"
    message: str = "This is a test email from Pi Monitor."

def _default_service_links() -> List[ServiceLink]:
    return [
        ServiceLink(name="Jellyfin", url="http://localhost:8096", icon="🎬", container_name="jellyfin"),
        ServiceLink(name="Portainer", url="http://localhost:9000", icon="🐳", container_name="portainer"),
        ServiceLink(name="qBittorrent", url="http://localhost:8080", icon="📥", container_name="qbittorrent"),
        ServiceLink(name="Uptime Kuma", url="http://localhost:3001", icon="📊", container_name="uptime-kuma"),
        ServiceLink(name="Home Assistant", url="http://localhost:8123", icon="🏠", container_name="homeassistant"),
        ServiceLink(name="Immich", url="http://localhost:2283", icon="📷", container_name="immich"),
        ServiceLink(name="Homebridge", url="http://localhost:8581", icon="🌉", container_name="homebridge"),
    ]

def _ensure_service_links(settings: dict) -> dict:
    if not settings.get("service_links"):
        settings["service_links"] = [s.dict() for s in _default_service_links()]
    return settings

def _normalize_service_links(links: List[dict], host: str) -> List[dict]:
    local_hosts = {"localhost", "127.0.0.1", "0.0.0.0", "::1"}
    normalized = []
    for link in links or []:
        url = link.get("url", "")
        try:
            parsed = urlparse(url)
            if parsed.hostname in local_hosts:
                port = f":{parsed.port}" if parsed.port else ""
                netloc = f"{host}{port}"
                if parsed.username:
                    auth = parsed.username
                    if parsed.password:
                        auth = f"{auth}:{parsed.password}"
                    netloc = f"{auth}@{netloc}"
                parsed = parsed._replace(netloc=netloc)
                url = urlunparse(parsed)
        except Exception:
            pass
        normalized.append({**link, "url": url})
    return normalized


@router.get("/")
async def get_settings(current_user: dict = Depends(get_current_user)):
    """Get application settings"""
    db = get_database()
    settings = await db.settings.find_one()

    if not settings:
        default_settings = AppSettings(service_links=_default_service_links()).dict()
        await db.settings.update_one({}, {"$set": default_settings}, upsert=True)
        return default_settings

    settings = _strip_id(settings)
    had_links = bool(settings.get("service_links"))
    settings = _ensure_service_links(settings)
    if not had_links:
        await db.settings.update_one({}, {"$set": {"service_links": settings["service_links"]}}, upsert=True)
    return settings


@router.get("/resolved/{host}")
async def get_settings_resolved(host: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    settings = await db.settings.find_one()
    if not settings:
        settings = AppSettings(service_links=_default_service_links()).dict()
        await db.settings.update_one({}, {"$set": settings}, upsert=True)
    else:
        settings = _strip_id(settings)
    had_links = bool(settings.get("service_links"))
    settings = _ensure_service_links(settings)
    if not had_links:
        await db.settings.update_one({}, {"$set": {"service_links": settings["service_links"]}}, upsert=True)
    settings["service_links"] = _normalize_service_links(settings.get("service_links", []), host)
    return settings


@router.put("/")
async def update_settings(settings: AppSettings, current_user: dict = Depends(get_current_user)):
    """Update application settings"""
    db = get_database()
    settings_dict = settings.dict()

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


@router.post("/smtp/test")
async def test_smtp(request: SMTPTestRequest, current_user: dict = Depends(get_current_user)):
    db = get_database()
    settings = await db.settings.find_one() or {}
    smtp = settings.get("smtp_settings") or {}
    configured, reason = smtp_is_configured(smtp)
    if not configured:
        raise HTTPException(status_code=400, detail=reason)
    try:
        await asyncio.to_thread(
            send_email_sync,
            smtp,
            request.subject,
            request.message,
            request.to_email
        )
        cache_store.set(KEY_SMS_FORWARDER, {
            "active": True,
            "configured": True,
            "last_error": None,
            "last_sent_at": datetime.now(ZoneInfo("Australia/Melbourne")).isoformat(),
            "last_forwarded_sms": {
                "from": "SMTP Test",
                "timestamp": datetime.now(ZoneInfo("Australia/Melbourne")).isoformat(),
                "preview": (request.message or "")[:80]
            }
        }, ttl=30, stale_ttl=120)
        return {"message": "Test email sent"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send test email: {e}")


@router.get("/smtp/status")
async def smtp_forwarding_status(current_user: dict = Depends(get_current_user)):
    status = cache_store.snapshot(KEY_SMS_FORWARDER).get("data")
    if not status:
        db = get_database()
        settings = await db.settings.find_one() or {}
        smtp = settings.get("smtp_settings") or {}
        configured, reason = smtp_is_configured(smtp)
        status = {
            "active": False,
            "configured": configured,
            "last_error": None if configured else reason,
            "last_sent_at": None,
            "last_forwarded_sms": None
        }
    return status


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
