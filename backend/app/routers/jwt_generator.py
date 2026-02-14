"""
JWT Generator router.
Generates JWT tokens for external services.
Supports two modes:
  1. Using stored jwt_secret (from Settings)
  2. Using jwt_secret provided on-the-fly (not stored anywhere)
"""

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.models.secret import UserSecret
from app.routers.deps import CurrentUser, DbSession
from app.schemas.secret import JwtGenerateRequest, JwtGenerateResponse
from app.services.jwt_gen_service import generate_service_jwt, generate_service_jwt_plaintext

router = APIRouter(prefix="/api/jwt", tags=["JWT Generator"])


@router.post("/generate", response_model=JwtGenerateResponse)
async def generate_jwt(
    data: JwtGenerateRequest,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Generate a JWT token for an external service.

    If jwt_secret is provided in the request body, it is used directly
    (useful for environments where you don't want to store secrets).

    If jwt_secret is NOT provided, the stored secret for the environment is used.
    """
    try:
        if data.jwt_secret:
            # Mode 1: Use the on-the-fly secret (not stored)
            token, payload = generate_service_jwt_plaintext(
                jwt_secret=data.jwt_secret,
                user_id_value=data.user_id_value,
            )
        else:
            # Mode 2: Use the stored encrypted secret
            result = await db.execute(
                select(UserSecret).where(
                    UserSecret.user_id == current_user.id,
                    UserSecret.environment_id == data.environment_id,
                )
            )
            secret = result.scalar_one_or_none()

            if secret is None or secret.jwt_secret_encrypted is None:
                raise HTTPException(
                    status_code=400,
                    detail="No jwt_secret stored for this environment. Either save one in Settings or provide it directly.",
                )

            token, payload = generate_service_jwt(
                jwt_secret_encrypted=secret.jwt_secret_encrypted,
                user_salt=current_user.encryption_salt,
                user_id_value=data.user_id_value,
            )
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate JWT: {str(e)}",
        )

    return JwtGenerateResponse(token=token, payload=payload)
