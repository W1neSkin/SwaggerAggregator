"""
Swagger/OpenAPI spec fetcher service.
Fetches OpenAPI specs from remote services, parses them,
and caches them in the database.
"""

from datetime import datetime, timezone, timedelta

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.environment import Environment
from app.models.swagger_cache import SwaggerCache
from app.schemas.swagger import EndpointInfo

# Cache TTL: specs older than this will be re-fetched
CACHE_TTL_MINUTES = 10


async def fetch_swagger_spec(
    db: AsyncSession,
    environment: Environment,
    swagger_type: str = "main",
    force_refresh: bool = False,
) -> dict:
    """
    Fetch the OpenAPI spec for an environment.
    Uses cached version if available and not expired.

    Args:
        db: Database session
        environment: The environment to fetch swagger from
        swagger_type: "main" or "admin"
        force_refresh: If True, always fetch from remote

    Returns:
        The OpenAPI spec as a dict
    """
    # Check cache first (unless force refresh)
    if not force_refresh:
        cached = await _get_cached_spec(db, environment.id, swagger_type)
        if cached:
            return cached

    # Determine the URL to fetch
    if swagger_type == "admin":
        url = f"{environment.base_url.rstrip('/')}{environment.admin_swagger_path}"
    else:
        url = f"{environment.base_url.rstrip('/')}{environment.swagger_path}"

    # Fetch from remote service
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        spec = response.json()

    # Save to cache
    await _save_to_cache(db, environment.id, swagger_type, spec)

    return spec


async def _get_cached_spec(
    db: AsyncSession,
    environment_id,
    swagger_type: str,
) -> dict | None:
    """Get cached spec if it exists and is not expired."""
    result = await db.execute(
        select(SwaggerCache).where(
            SwaggerCache.environment_id == environment_id,
            SwaggerCache.swagger_type == swagger_type,
        )
    )
    cache = result.scalar_one_or_none()

    if cache is None:
        return None

    # Check if cache is expired
    expiry = cache.fetched_at + timedelta(minutes=CACHE_TTL_MINUTES)
    if datetime.now(timezone.utc) > expiry:
        return None

    return cache.spec_json


async def _save_to_cache(
    db: AsyncSession,
    environment_id,
    swagger_type: str,
    spec: dict,
) -> None:
    """Save or update cached spec in the database."""
    result = await db.execute(
        select(SwaggerCache).where(
            SwaggerCache.environment_id == environment_id,
            SwaggerCache.swagger_type == swagger_type,
        )
    )
    cache = result.scalar_one_or_none()

    if cache:
        # Update existing cache entry
        cache.spec_json = spec
        cache.fetched_at = datetime.now(timezone.utc)
    else:
        # Create new cache entry
        cache = SwaggerCache(
            environment_id=environment_id,
            swagger_type=swagger_type,
            spec_json=spec,
        )
        db.add(cache)

    await db.commit()


def parse_endpoints(spec: dict) -> list[EndpointInfo]:
    """
    Parse an OpenAPI spec into a list of endpoint descriptions.
    Supports OpenAPI 3.x format.
    """
    endpoints = []
    paths = spec.get("paths", {})

    for path, methods in paths.items():
        for method, details in methods.items():
            # Skip non-HTTP-method keys like "parameters", "summary"
            if method.upper() not in ("GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"):
                continue

            endpoint = EndpointInfo(
                method=method.upper(),
                path=path,
                summary=details.get("summary", ""),
                description=details.get("description", ""),
                tags=details.get("tags", []),
                parameters=details.get("parameters", []),
                request_body=details.get("requestBody"),
                responses=details.get("responses", {}),
                operation_id=details.get("operationId", ""),
            )
            endpoints.append(endpoint)

    return endpoints
