"""Auth-related Pydantic schemas for request/response validation."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    """Request body for user registration."""
    email: EmailStr
    password: str  # min length validated in service layer


class UserLogin(BaseModel):
    """Request body for user login."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Response containing JWT access token."""
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """Public user info returned in API responses."""
    id: uuid.UUID
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}
