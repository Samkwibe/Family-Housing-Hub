"""MongoDB connection helpers."""
import os
from pymongo import MongoClient
from pymongo.database import Database

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
        _client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    return _client


def get_db() -> Database:
    db_name = os.getenv('MONGODB_DB', 'family_housing_hub')
    return get_client()[db_name]


def ping_db() -> bool:
    try:
        get_client().admin.command('ping')
        return True
    except Exception:
        return False
