from typing import Dict, Any


def build_cache_headers(meta: Dict[str, Any]) -> Dict[str, str]:
    # Use stale-while-revalidate to allow stale cached data
    ttl = int(meta.get("ttl", 2)) if meta else 2
    stale_ttl = int(meta.get("stale_ttl", ttl * 3)) if meta else ttl * 3
    max_age = max(ttl, 1)
    swr = max(stale_ttl - ttl, 0)
    return {
        "Cache-Control": f"public, max-age={max_age}, stale-while-revalidate={swr}",
    }
