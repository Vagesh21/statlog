from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

load_dotenv()

from utils.database import connect_to_mongo, close_mongo_connection, get_database
from utils.auth import get_password_hash
from routes import auth, metrics, usb, docker_api, dongle, settings, health

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    
    # Initialize default admin user if not exists
    db = get_database()
    admin_username = os.getenv("DEFAULT_ADMIN_USERNAME", "admin")
    admin_password = os.getenv("DEFAULT_ADMIN_PASSWORD", "password")
    
    existing_admin = await db.users.find_one({"username": admin_username})
    if not existing_admin:
        await db.users.insert_one({
            "username": admin_username,
            "hashed_password": get_password_hash(admin_password),
            "is_active": True
        })
        print(f"Default admin user created: {admin_username}")
    
    yield
    
    # Shutdown
    await close_mongo_connection()

app = FastAPI(
    title="Raspberry Pi Monitor API",
    description="Comprehensive system monitoring dashboard for Raspberry Pi",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(metrics.router)
app.include_router(usb.router)
app.include_router(docker_api.router)
app.include_router(dongle.router)
app.include_router(settings.router)

@app.get("/")
async def root():
    return {
        "message": "Raspberry Pi Monitor API",
        "version": "1.0.0",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
