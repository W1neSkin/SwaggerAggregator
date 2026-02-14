"""
JWT Generator router.
Generates JWT tokens for external services using stored jwt_secret.
"""

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.models.secret import UserSecret
from app.routers.deps import CurrentUser, DbSession
from app.schemas.secret import JwtGenerateRequest, JwtGenerateResponse
from app.services.jwt_gen_service import generate_service_jwt

router = APIRouter(prefix="/api/jwt", tags=["JWT Generator"])


@router.post("/generate", response_model=JwtGenerateResponse)
async def generate_jwt(
    data: JwtGenerateRequest,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Generate a JWT token for an external service.
    Uses the stored jwt_secret for the specified environment.
    The token will contain the provided user_id_value in the 'sub' claim.
    """
    # Get the user's stored secret for this environment
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
            detail="No jwt_secret stored for this environment. Save it first in Settings.",
        )

    try:
        token, payload = generate_service_jwt(
            jwt_secret_encrypted=secret.jwt_secret_encrypted,
            user_salt=current_user.encryption_salt,
            user_id_value=data.user_id_value,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate JWT: {str(e)}",
        )

    return JwtGenerateResponse(token=token, payload=payload)
