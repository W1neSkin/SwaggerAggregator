"""
Swagger router.
Fetches, caches, and serves OpenAPI specs from remote services.
"""

import uuid

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from app.models.environment import Environment
from app.routers.deps import CurrentUser, DbSession
from app.schemas.swagger import EndpointInfo, SwaggerSpecResponse
from app.services.swagger_fetcher import fetch_swagger_spec, parse_endpoints

router = APIRouter(prefix="/api/swagger", tags=["Swagger"])


@router.get("/{environment_id}", response_model=SwaggerSpecResponse)
async def get_swagger_spec(
    environment_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    type: str = Query("main", regex="^(main|admin)$"),
):
    """
    Fetch the OpenAPI spec for an environment.
    Uses cached version if available. Set type=admin for admin swagger.
    """
    # Get the environment
    result = await db.execute(select(Environment).where(Environment.id == environment_id))
    env = result.scalar_one_or_none()
    if env is None:
        raise HTTPException(status_code=404, detail="Environment not found")

    try:
        spec = await fetch_swagger_spec(db, env, swagger_type=type)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch swagger spec: {str(e)}",
        )

    return SwaggerSpecResponse(
        spec=spec,
        fetched_at="now",  # Will be improved with actual cache timestamp
        source="cache_or_remote",
    )


@router.get("/{environment_id}/endpoints", response_model=list[EndpointInfo])
async def get_endpoints(
    environment_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    type: str = Query("main", regex="^(main|admin)$"),
):
    """
    Get a parsed list of endpoints from the OpenAPI spec.
    Each endpoint includes method, path, description, parameters, etc.
    """
    result = await db.execute(select(Environment).where(Environment.id == environment_id))
    env = result.scalar_one_or_none()
    if env is None:
        raise HTTPException(status_code=404, detail="Environment not found")

    try:
        spec = await fetch_swagger_spec(db, env, swagger_type=type)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch swagger spec: {str(e)}",
        )

    return parse_endpoints(spec)


@router.post("/{environment_id}/refresh", response_model=SwaggerSpecResponse)
async def refresh_swagger_spec(
    environment_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    type: str = Query("main", regex="^(main|admin)$"),
):
    """Force re-fetch the OpenAPI spec from the remote service (ignores cache)."""
    result = await db.execute(select(Environment).where(Environment.id == environment_id))
    env = result.scalar_one_or_none()
    if env is None:
        raise HTTPException(status_code=404, detail="Environment not found")

    try:
        spec = await fetch_swagger_spec(db, env, swagger_type=type, force_refresh=True)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch swagger spec: {str(e)}",
        )

    return SwaggerSpecResponse(
        spec=spec,
        fetched_at="now",
        source="remote",
    )
