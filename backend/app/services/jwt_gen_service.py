"""
JWT generation service.
Generates JWT tokens using the user's stored jwt_secret.
This is NOT for the aggregator's own auth — it's for generating
tokens to use with the external services being managed.
"""

from datetime import datetime, timedelta, timezone

from jose import jwt

from app.services.encryption import decrypt_secret


def generate_service_jwt(
    jwt_secret_encrypted: bytes,
    user_salt: bytes,
    user_id_value: str,
    algorithm: str = "HS256",
    expire_hours: int = 24,
) -> tuple[str, dict]:
    """
    Generate a JWT token for an external service.

    Args:
        jwt_secret_encrypted: The encrypted jwt_secret from the database
        user_salt: The user's encryption salt for decrypting the secret
        user_id_value: The user_id value to put in the JWT payload
        algorithm: JWT signing algorithm (default: HS256)
        expire_hours: Token expiry in hours (default: 24)

    Returns:
        Tuple of (token_string, payload_dict)
    """
    # Decrypt the stored jwt_secret
    jwt_secret = decrypt_secret(jwt_secret_encrypted, user_salt)

    # Build the JWT payload matching the pattern from the example services
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id_value,
        "iat": now,
        "exp": now + timedelta(hours=expire_hours),
    }

    # Sign the token with the decrypted secret
    token = jwt.encode(payload, jwt_secret, algorithm=algorithm)

    # Return token and a serializable version of the payload
    payload_display = {
        "sub": user_id_value,
        "iat": now.isoformat(),
        "exp": (now + timedelta(hours=expire_hours)).isoformat(),
    }

    return token, payload_display
