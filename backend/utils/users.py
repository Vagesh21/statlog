from typing import List, Dict, Any
from utils.database import get_database


def public_user(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(doc.get("_id")) if doc.get("_id") is not None else doc.get("id"),
        "username": doc.get("username"),
        "is_active": doc.get("is_active", True),
        "role": doc.get("role", "admin"),
    }


def is_admin(user: Dict[str, Any]) -> bool:
    return user.get("role", "admin") == "admin"
