from fastapi import APIRouter, Depends, HTTPException, status
from routes.auth import get_current_user
from utils.database import get_database
from utils.auth import get_password_hash, verify_password
from utils.users import public_user, is_admin
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/users", tags=["users"])


class UserCreateIn(BaseModel):
    username: str
    password: str
    role: Optional[str] = "admin"
    is_active: bool = True


class UserUpdateIn(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


class PasswordResetIn(BaseModel):
    new_password: str


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str


@router.get("")
async def list_users(current_user: dict = Depends(get_current_user)):
    if not is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    db = get_database()
    users = await db.users.find().to_list(length=200)
    return {"users": [public_user(u) for u in users]}


@router.post("")
async def create_user(user: UserCreateIn, current_user: dict = Depends(get_current_user)):
    if not is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    db = get_database()
    existing = await db.users.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    new_user = {
        "username": user.username,
        "hashed_password": get_password_hash(user.password),
        "is_active": user.is_active,
        "role": user.role or "admin"
    }
    await db.users.insert_one(new_user)
    return {"message": "User created"}


@router.patch("/{username}")
async def update_user(username: str, payload: UserUpdateIn, current_user: dict = Depends(get_current_user)):
    if not is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    db = get_database()
    update = {}
    if payload.role is not None:
        update["role"] = payload.role
    if payload.is_active is not None:
        update["is_active"] = payload.is_active
    if not update:
        return {"message": "No changes"}
    result = await db.users.update_one({"username": username}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User updated"}


@router.post("/{username}/reset-password")
async def reset_password(username: str, payload: PasswordResetIn, current_user: dict = Depends(get_current_user)):
    if not is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    db = get_database()
    result = await db.users.update_one(
        {"username": username},
        {"$set": {"hashed_password": get_password_hash(payload.new_password)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Password reset"}


@router.post("/me/change-password")
async def change_password(payload: PasswordChangeIn, current_user: dict = Depends(get_current_user)):
    db = get_database()
    username = current_user.get("username")
    user = await db.users.find_one({"username": username})
    if not user or not verify_password(payload.current_password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Current password incorrect")
    await db.users.update_one(
        {"username": username},
        {"$set": {"hashed_password": get_password_hash(payload.new_password)}}
    )
    return {"message": "Password changed"}
