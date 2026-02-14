"""
Environments router.
CRUD operations for managing deployment environments of services.
"""

import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.models.environment import Environment
from app.models.service import Service
from app.routers.deps import CurrentUser, DbSession
from app.schemas.service import EnvironmentCreate, EnvironmentUpdate, EnvironmentResponse

router = APIRouter(prefix="/api", tags=["Environments"])


@router.get("/services/{service_id}/environments", response_model=list[EnvironmentResponse])
async def list_environments(service_id: uuid.UUID, db: DbSession, current_user: CurrentUser):
    """List all environments for a service."""
    # Verify service exists
    svc = await db.execute(select(Service).where(Service.id == service_id))
    if svc.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Service not found")

    result = await db.execute(
        select(Environment)
        .where(Environment.service_id == service_id)
        .order_by(Environment.name)
    )
    return result.scalars().all()


@router.post(
    "/services/{service_id}/environments",
    response_model=EnvironmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_environment(
    service_id: uuid.UUID, data: EnvironmentCreate, db: DbSession, current_user: CurrentUser
):
    """Add a new environment to a service."""
    # Verify service exists
    svc_result = await db.execute(select(Service).where(Service.id == service_id))
    if svc_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Service not found")

    env = Environment(
        service_id=service_id,
        name=data.name,
        base_url=data.base_url,
        swagger_path=data.swagger_path,
        admin_swagger_path=data.admin_swagger_path,
    )
    db.add(env)
    await db.commit()
    await db.refresh(env)
    return env


@router.put("/environments/{env_id}", response_model=EnvironmentResponse)
async def update_environment(
    env_id: uuid.UUID, data: EnvironmentUpdate, db: DbSession, current_user: CurrentUser
):
    """Update an environment."""
    result = await db.execute(select(Environment).where(Environment.id == env_id))
    env = result.scalar_one_or_none()
    if env is None:
        raise HTTPException(status_code=404, detail="Environment not found")

    if data.name is not None:
        env.name = data.name
    if data.base_url is not None:
        env.base_url = data.base_url
    if data.swagger_path is not None:
        env.swagger_path = data.swagger_path
    if data.admin_swagger_path is not None:
        env.admin_swagger_path = data.admin_swagger_path

    await db.commit()
    await db.refresh(env)
    return env


@router.delete("/environments/{env_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_environment(env_id: uuid.UUID, db: DbSession, current_user: CurrentUser):
    """Delete an environment."""
    result = await db.execute(select(Environment).where(Environment.id == env_id))
    env = result.scalar_one_or_none()
    if env is None:
        raise HTTPException(status_code=404, detail="Environment not found")

    await db.delete(env)
    await db.commit()
