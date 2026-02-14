"""
Encryption service for storing user secrets securely.
Uses Fernet symmetric encryption with per-user keys.

Key derivation: PBKDF2(MASTER_ENCRYPTION_KEY, user_salt, iterations=480000)
This means even if the database is compromised, secrets cannot be
decrypted without the MASTER_ENCRYPTION_KEY environment variable.
"""

import base64
import hashlib

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

from app.config import settings


def _derive_key(user_salt: bytes) -> bytes:
    """
    Derive a Fernet-compatible encryption key from the master key + user salt.
    Uses PBKDF2 with 480,000 iterations for strong key derivation.
    """
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=user_salt,
        iterations=480000,
    )
    key = kdf.derive(settings.MASTER_ENCRYPTION_KEY.encode("utf-8"))
    # Fernet requires base64-encoded 32-byte key
    return base64.urlsafe_b64encode(key)


def encrypt_secret(plaintext: str, user_salt: bytes) -> bytes:
    """
    Encrypt a plaintext secret using the user's derived key.
    Returns encrypted bytes that can be stored in the database.
    """
    key = _derive_key(user_salt)
    fernet = Fernet(key)
    return fernet.encrypt(plaintext.encode("utf-8"))


def decrypt_secret(encrypted_data: bytes, user_salt: bytes) -> str:
    """
    Decrypt an encrypted secret using the user's derived key.
    Returns the original plaintext string.
    """
    key = _derive_key(user_salt)
    fernet = Fernet(key)
    return fernet.decrypt(encrypted_data).decode("utf-8")
