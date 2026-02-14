"""
Services router.
CRUD operations for managing registered microservices.
"""

import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.models.service import Service
from app.routers.deps import CurrentUser, DbSession
from app.schemas.service import ServiceCreate, ServiceUpdate, ServiceResponse

router = APIRouter(prefix="/api/services", tags=["Services"])


@router.get("", response_model=list[ServiceResponse])
async def list_services(db: DbSession, current_user: CurrentUser):
    """List all registered services."""
    result = await db.execute(select(Service).order_by(Service.name))
    services = result.scalars().all()

    # Build response with environment count
    response = []
    for svc in services:
        response.append(ServiceResponse(
            id=svc.id,
            name=svc.name,
            description=svc.description,
            created_by=svc.created_by,
            created_at=svc.created_at,
            environments_count=len(svc.environments),
        ))
    return response


@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(data: ServiceCreate, db: DbSession, current_user: CurrentUser):
    """Create a new service."""
    service = Service(
        name=data.name,
        description=data.description,
        created_by=current_user.id,
    )
    db.add(service)
    await db.commit()
    await db.refresh(service)

    return ServiceResponse(
        id=service.id,
        name=service.name,
        description=service.description,
        created_by=service.created_by,
        created_at=service.created_at,
        environments_count=0,
    )


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(service_id: uuid.UUID, db: DbSession, current_user: CurrentUser):
    """Get a single service by ID."""
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")

    return ServiceResponse(
        id=service.id,
        name=service.name,
        description=service.description,
        created_by=service.created_by,
        created_at=service.created_at,
        environments_count=len(service.environments),
    )


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: uuid.UUID, data: ServiceUpdate, db: DbSession, current_user: CurrentUser
):
    """Update a service. Only the creator can update."""
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")

    # Only the creator can update
    if service.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can update this service")

    if data.name is not None:
        service.name = data.name
    if data.description is not None:
        service.description = data.description

    await db.commit()
    await db.refresh(service)

    return ServiceResponse(
        id=service.id,
        name=service.name,
        description=service.description,
        created_by=service.created_by,
        created_at=service.created_at,
        environments_count=len(service.environments),
    )


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(service_id: uuid.UUID, db: DbSession, current_user: CurrentUser):
    """Delete a service and all its environments. Only the creator can delete."""
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")

    if service.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can delete this service")

    await db.delete(service)
    await db.commit()
