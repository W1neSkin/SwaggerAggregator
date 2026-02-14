"""Secret and JWT generation Pydantic schemas."""

import uuid

from pydantic import BaseModel


class SecretSave(BaseModel):
    """Request body for saving secrets for an environment."""
    jwt_secret: str | None = None
    admin_password: str | None = None


class SecretStatusResponse(BaseModel):
    """Response showing which secrets exist (never returns actual values)."""
    environment_id: uuid.UUID
    has_jwt_secret: bool = False
    has_admin_password: bool = False


class JwtGenerateRequest(BaseModel):
    """Request body for generating a JWT token."""
    environment_id: uuid.UUID
    user_id_value: str  # The user_id to embed in the JWT payload


class JwtGenerateResponse(BaseModel):
    """Response containing the generated JWT token."""
    token: str
    payload: dict  # The decoded payload for reference
