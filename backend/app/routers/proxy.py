"""
Proxy router — executes API requests to target services.
This is the core feature: call any endpoint from the aggregated swaggers
with proper authentication (JWT or admin_password).

The request goes: Browser -> Our Backend (proxy) -> Target Service
This avoids CORS issues since the browser only talks to our backend.
"""

import time

import httpx
from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.models.secret import UserSecret
from app.routers.deps import CurrentUser, DbSession
from app.schemas.proxy import ProxyRequest, ProxyResponse
from app.services.encryption import decrypt_secret

router = APIRouter(prefix="/api/proxy", tags=["Proxy"])


@router.post("/execute", response_model=ProxyResponse)
async def execute_request(
    data: ProxyRequest,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Execute an HTTP request to a target service.

    Auth modes:
    - "jwt": Attaches Bearer token. Uses data.jwt_token if provided,
             otherwise generates from stored secret.
    - "admin": Attaches admin_password as X-Admin-Password header.
               Uses data.admin_password if provided, otherwise uses stored secret.
    - "none" or None: No auth headers added.

    Custom headers from data.headers are always applied (can override auth).
    """
    # Build headers dict
    headers = dict(data.headers)

    # Apply auth if requested
    if data.auth_mode == "jwt":
        token = data.jwt_token
        if not token and data.environment_id:
            # No token provided — this is expected if user already generated one
            # They should pass the JWT token from the JWT Generator tab
            pass
        if token:
            headers.setdefault("Authorization", f"Bearer {token}")

    elif data.auth_mode == "admin":
        password = data.admin_password
        # If no password provided, try to load stored one
        if not password and data.environment_id:
            password = await _get_stored_admin_password(
                db, current_user.id, data.environment_id, current_user.encryption_salt
            )
        if password:
            # Send admin password as query parameter (most common FastAPI admin pattern)
            # and also as header (for services that expect header-based auth)
            if data.query_params is None:
                data.query_params = {}
            data.query_params.setdefault("admin_password", password)
            headers.setdefault("X-Admin-Password", password)

    # Execute the request to the target service
    try:
        start = time.monotonic()
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.request(
                method=data.method.upper(),
                url=data.url,
                headers=headers,
                params=data.query_params or None,
                json=data.body if isinstance(data.body, (dict, list)) else None,
                content=data.body if isinstance(data.body, str) else None,
            )
        elapsed_ms = int((time.monotonic() - start) * 1000)
    except httpx.ConnectError:
        raise HTTPException(
            status_code=502,
            detail="Cannot connect to target service. Is it running?",
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Target service timed out (30s limit).",
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Request failed: {str(e)}",
        )

    # Return the response
    return ProxyResponse(
        status_code=response.status_code,
        headers=dict(response.headers),
        body=response.text,
        elapsed_ms=elapsed_ms,
    )


async def _get_stored_admin_password(
    db, user_id, environment_id: str, encryption_salt: str
) -> str | None:
    """Load and decrypt the stored admin_password for an environment."""
    result = await db.execute(
        select(UserSecret).where(
            UserSecret.user_id == user_id,
            UserSecret.environment_id == environment_id,
        )
    )
    secret = result.scalar_one_or_none()
    if secret and secret.admin_password_encrypted:
        try:
            return decrypt_secret(secret.admin_password_encrypted, encryption_salt.encode("utf-8"))
        except Exception:
            return None
    return None
