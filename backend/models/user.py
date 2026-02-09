from pydantic import BaseModel, Field
from typing import Optional
import uuid

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    hashed_password: str
    is_active: bool = True

    class Config:
        json_schema_extra = {
            "example": {
                "username": "admin",
                "hashed_password": "$2b$12$...",
                "is_active": True
            }
        }

class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
