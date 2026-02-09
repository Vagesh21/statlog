from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid

class ServiceLink(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    url: str
    icon: Optional[str] = None
    enabled: bool = True
    container_name: Optional[str] = None
    description: Optional[str] = None

class SMTPSettings(BaseModel):
    server: str = "smtp.gmail.com"
    port: int = 465
    secure: str = "ssl"
    username: str = ""
    app_password: str = ""
    email_from: str = ""
    email_from_name: str = ""
    email_to: str = ""

class APIKeys(BaseModel):
    google_calendar_credentials: Optional[str] = None
    anilist_client_id: Optional[str] = None
    anilist_client_secret: Optional[str] = None
    myanimelist_client_id: Optional[str] = None

class AppSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    refresh_rate: int = 2  # seconds
    service_links: List[ServiceLink] = []
    smtp_settings: SMTPSettings = SMTPSettings()
    api_keys: APIKeys = APIKeys()
    temperature_warning_threshold: int = 70
    temperature_critical_threshold: int = 80
    cpu_warning_threshold: int = 80
    cpu_critical_threshold: int = 95
