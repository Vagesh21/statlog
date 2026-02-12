import time
import threading
from typing import Any, Dict, Optional

class CacheEntry:
    def __init__(self, data: Any, ttl: float, stale_ttl: Optional[float] = None):
        self.data = data
        self.ttl = ttl
        self.stale_ttl = stale_ttl if stale_ttl is not None else ttl * 3
        self.updated_at = time.time()

    def meta(self) -> Dict[str, Any]:
        age = time.time() - self.updated_at
        stale = age > self.ttl
        expired = age > self.stale_ttl
        return {
            "age": age,
            "stale": stale,
            "expired": expired,
            "updated_at": self.updated_at,
            "ttl": self.ttl,
            "stale_ttl": self.stale_ttl,
        }

class CacheStore:
    def __init__(self):
        self._data: Dict[str, CacheEntry] = {}
        self._lock = threading.Lock()

    def set(self, key: str, data: Any, ttl: float, stale_ttl: Optional[float] = None) -> None:
        with self._lock:
            self._data[key] = CacheEntry(data, ttl=ttl, stale_ttl=stale_ttl)

    def get(self, key: str) -> Optional[CacheEntry]:
        with self._lock:
            return self._data.get(key)

    def snapshot(self, key: str) -> Dict[str, Any]:
        entry = self.get(key)
        if not entry:
            return {"data": None, "meta": {"stale": True, "expired": True, "age": None}}
        return {"data": entry.data, "meta": entry.meta()}

cache_store = CacheStore()
