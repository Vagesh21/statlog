from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/pi_monitor")

class Database:
    client: AsyncIOMotorClient = None
    db = None

def get_database():
    return Database.db

async def connect_to_mongo():
    Database.client = AsyncIOMotorClient(MONGO_URL)
    Database.db = Database.client.get_default_database()
    print(f"Connected to MongoDB: {MONGO_URL}")

async def close_mongo_connection():
    if Database.client:
        Database.client.close()
        print("Closed MongoDB connection")
