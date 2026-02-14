"""
Secrets router.
Manages encrypted jwt_secret and admin_password per user per environment.
Secrets are never returned in API responses — only existence status is exposed.
"""

import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.models.environment import Environment
from app.models.secret import UserSecret
from app.routers.deps import CurrentUser, DbSession
from app.schemas.secret import SecretSave, SecretStatusResponse
from app.services.encryption import encrypt_secret

router = APIRouter(prefix="/api/secrets", tags=["Secrets"])


@router.get("/{environment_id}", response_model=SecretStatusResponse)
async def get_secret_status(
    environment_id: uuid.UUID, db: DbSession, current_user: CurrentUser
):
    """
    Check which secrets exist for this environment.
    Never returns actual secret values — only True/False status.
    """
    # Verify environment exists
    env_result = await db.execute(select(Environment).where(Environment.id == environment_id))
    if env_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Environment not found")

    result = await db.execute(
        select(UserSecret).where(
            UserSecret.user_id == current_user.id,
            UserSecret.environment_id == environment_id,
        )
    )
    secret = result.scalar_one_or_none()

    return SecretStatusResponse(
        environment_id=environment_id,
        has_jwt_secret=secret is not None and secret.jwt_secret_encrypted is not None,
        has_admin_password=secret is not None and secret.admin_password_encrypted is not None,
    )


@router.put("/{environment_id}", response_model=SecretStatusResponse)
async def save_secrets(
    environment_id: uuid.UUID,
    data: SecretSave,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Save or update secrets for an environment.
    Secrets are encrypted before storage using the user's derived key.
    """
    # Verify environment exists
    env_result = await db.execute(select(Environment).where(Environment.id == environment_id))
    if env_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Environment not found")

    # Get existing secret entry or create new
    result = await db.execute(
        select(UserSecret).where(
            UserSecret.user_id == current_user.id,
            UserSecret.environment_id == environment_id,
        )
    )
    secret = result.scalar_one_or_none()

    if secret is None:
        secret = UserSecret(
            user_id=current_user.id,
            environment_id=environment_id,
        )
        db.add(secret)

    # Encrypt and save provided secrets
    user_salt = current_user.encryption_salt
    if data.jwt_secret is not None:
        secret.jwt_secret_encrypted = encrypt_secret(data.jwt_secret, user_salt)
    if data.admin_password is not None:
        secret.admin_password_encrypted = encrypt_secret(data.admin_password, user_salt)

    await db.commit()
    await db.refresh(secret)

    return SecretStatusResponse(
        environment_id=environment_id,
        has_jwt_secret=secret.jwt_secret_encrypted is not None,
        has_admin_password=secret.admin_password_encrypted is not None,
    )


@router.delete("/{environment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_secrets(
    environment_id: uuid.UUID, db: DbSession, current_user: CurrentUser
):
    """Delete all secrets for an environment."""
    result = await db.execute(
        select(UserSecret).where(
            UserSecret.user_id == current_user.id,
            UserSecret.environment_id == environment_id,
        )
    )
    secret = result.scalar_one_or_none()
    if secret is None:
        raise HTTPException(status_code=404, detail="No secrets found for this environment")

    await db.delete(secret)
    await db.commit()
