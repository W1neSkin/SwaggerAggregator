"""
Swagger/OpenAPI spec fetcher service.
Fetches OpenAPI specs from remote services, parses them,
and caches them in the database.
"""

import json
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.environment import Environment
from app.models.swagger_cache import SwaggerCache
from app.schemas.swagger import EndpointInfo

# Cache TTL: specs older than this will be re-fetched
CACHE_TTL_MINUTES = 10


# --- Custom exceptions for specific failure modes ---
class SwaggerFetchError(Exception):
    """Base exception for swagger fetch failures."""

    def __init__(self, message: str, url: str = ""):
        self.url = url
        super().__init__(message)


class SwaggerTimeoutError(SwaggerFetchError):
    """Raised when the remote service does not respond within the timeout."""


class SwaggerConnectionError(SwaggerFetchError):
    """Raised when the connection to the remote service fails (DNS, refused, etc.)."""


class SwaggerHttpError(SwaggerFetchError):
    """Raised when the remote returns a non-2xx HTTP status."""

    def __init__(self, message: str, url: str = "", status_code: int | None = None):
        super().__init__(message, url)
        self.status_code = status_code


class SwaggerInvalidJsonError(SwaggerFetchError):
    """Raised when the response body is not valid JSON."""


@dataclass
class SwaggerFetchResult:
    """Result of fetching a swagger spec, including metadata."""

    spec: dict
    fetched_at: datetime
    source: str  # "cache" or "remote"


async def fetch_swagger_spec(
    db: AsyncSession,
    environment: Environment,
    swagger_type: str = "main",
    force_refresh: bool = False,
) -> SwaggerFetchResult:
    """
    Fetch the OpenAPI spec for an environment.
    Uses cached version if available and not expired.
    Raises specific SwaggerFetchError subclasses on failure.

    Returns:
        SwaggerFetchResult with spec, fetched_at timestamp, and source.
    """
    # Check cache first (unless force refresh)
    if not force_refresh:
        cached = await _get_cached_spec(db, environment.id, swagger_type)
        if cached:
            spec, fetched_at = cached
            return SwaggerFetchResult(spec=spec, fetched_at=fetched_at, source="cache")

    # Determine the URL to fetch
    if swagger_type == "admin":
        url = f"{environment.base_url.rstrip('/')}{environment.admin_swagger_path}"
    else:
        url = f"{environment.base_url.rstrip('/')}{environment.swagger_path}"

    # Fetch from remote service with specific error handling
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
    except httpx.TimeoutException:
        raise SwaggerTimeoutError(f"Request timed out after 30s", url=url)
    except httpx.ConnectError:
        raise SwaggerConnectionError(f"Could not connect to {url}", url=url)
    except httpx.HTTPStatusError as e:
        raise SwaggerHttpError(
            f"HTTP {e.response.status_code} from {url}",
            url=url,
            status_code=e.response.status_code,
        )

    # Parse JSON response
    try:
        spec = response.json()
    except (json.JSONDecodeError, ValueError):
        raise SwaggerInvalidJsonError(f"Response is not valid JSON", url=url)

    # Save to cache and return
    fetched_at = await _save_to_cache(db, environment.id, swagger_type, spec)
    return SwaggerFetchResult(spec=spec, fetched_at=fetched_at, source="remote")


async def _get_cached_spec(
    db: AsyncSession,
    environment_id,
    swagger_type: str,
) -> tuple[dict, datetime] | None:
    """Get cached spec if it exists and is not expired. Returns (spec, fetched_at) or None."""
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

    return (cache.spec_json, cache.fetched_at)


async def _save_to_cache(
    db: AsyncSession,
    environment_id,
    swagger_type: str,
    spec: dict,
) -> datetime:
    """Save or update cached spec in the database. Returns the fetched_at timestamp."""
    fetched_at = datetime.now(timezone.utc)
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
        cache.fetched_at = fetched_at
    else:
        # Create new cache entry
        cache = SwaggerCache(
            environment_id=environment_id,
            swagger_type=swagger_type,
            spec_json=spec,
            fetched_at=fetched_at,
        )
        db.add(cache)

    await db.commit()
    return fetched_at


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
