"""
JWT generation service.
Generates JWT tokens for external services.
Supports two modes:
  1. Using a stored (encrypted) jwt_secret from the database
  2. Using a plaintext jwt_secret provided on-the-fly (not stored)
This is NOT for the aggregator's own auth — it's for generating
tokens to use with the external services being managed.
"""

from datetime import datetime, timedelta, timezone

from jose import jwt

from app.services.encryption import decrypt_secret


def _build_jwt(
    jwt_secret: str,
    user_id_value: str,
    algorithm: str = "HS256",
    expire_hours: int = 24,
) -> tuple[str, dict]:
    """
    Core JWT builder. Signs a token with the given plaintext secret.

    Returns:
        Tuple of (token_string, payload_dict_for_display)
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id_value,
        "iat": now,
        "exp": now + timedelta(hours=expire_hours),
    }

    # Sign the token
    token = jwt.encode(payload, jwt_secret, algorithm=algorithm)

    # Serializable version of payload for the response
    payload_display = {
        "sub": user_id_value,
        "iat": now.isoformat(),
        "exp": (now + timedelta(hours=expire_hours)).isoformat(),
    }

    return token, payload_display


def generate_service_jwt(
    jwt_secret_encrypted: bytes,
    user_salt: bytes,
    user_id_value: str,
    algorithm: str = "HS256",
    expire_hours: int = 24,
) -> tuple[str, dict]:
    """
    Generate a JWT using a stored (encrypted) jwt_secret.
    Decrypts the secret first, then signs the token.
    """
    jwt_secret = decrypt_secret(jwt_secret_encrypted, user_salt)
    return _build_jwt(jwt_secret, user_id_value, algorithm, expire_hours)


def generate_service_jwt_plaintext(
    jwt_secret: str,
    user_id_value: str,
    algorithm: str = "HS256",
    expire_hours: int = 24,
) -> tuple[str, dict]:
    """
    Generate a JWT using a plaintext jwt_secret provided on-the-fly.
    The secret is NOT stored — used for environments where the user
    prefers not to persist secrets (e.g. stage, prod).
    """
    return _build_jwt(jwt_secret, user_id_value, algorithm, expire_hours)
