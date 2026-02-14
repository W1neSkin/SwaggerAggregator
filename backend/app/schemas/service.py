"""Service and Environment Pydantic schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel


# --- Service schemas ---

class ServiceCreate(BaseModel):
    """Request body for creating a new service."""
    name: str
    description: str = ""


class ServiceUpdate(BaseModel):
    """Request body for updating a service."""
    name: str | None = None
    description: str | None = None


class ServiceResponse(BaseModel):
    """Service info returned in API responses."""
    id: uuid.UUID
    name: str
    description: str | None
    created_by: uuid.UUID
    created_at: datetime
    environments_count: int = 0

    model_config = {"from_attributes": True}


# --- Environment schemas ---

class EnvironmentCreate(BaseModel):
    """Request body for creating a new environment."""
    name: str  # e.g., "local", "dev", "stage", "prod"
    base_url: str  # e.g., "http://localhost:8000"
    swagger_path: str = "/openapi.json"
    admin_swagger_path: str = "/admin/openapi.json"


class EnvironmentUpdate(BaseModel):
    """Request body for updating an environment."""
    name: str | None = None
    base_url: str | None = None
    swagger_path: str | None = None
    admin_swagger_path: str | None = None


class EnvironmentResponse(BaseModel):
    """Environment info returned in API responses."""
    id: uuid.UUID
    service_id: uuid.UUID
    name: str
    base_url: str
    swagger_path: str
    admin_swagger_path: str
    created_at: datetime

    model_config = {"from_attributes": True}
