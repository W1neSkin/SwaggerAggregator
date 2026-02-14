"""
UserSecret model.
Stores encrypted jwt_secret and admin_password per user per environment.
Secrets are encrypted using Fernet with a key derived from MASTER_KEY + user salt.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, LargeBinary, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserSecret(Base):
    """Encrypted secrets for a user in a specific environment."""

    __tablename__ = "user_secrets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    environment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("environments.id", ondelete="CASCADE"), nullable=False
    )
    # Encrypted jwt_secret (nullable - user may not have set it yet)
    jwt_secret_encrypted: Mapped[bytes | None] = mapped_column(
        LargeBinary, nullable=True
    )
    # Encrypted admin_password (nullable - user may not have set it yet)
    admin_password_encrypted: Mapped[bytes | None] = mapped_column(
        LargeBinary, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Each user can only have one secret entry per environment
    __table_args__ = (
        UniqueConstraint("user_id", "environment_id", name="uq_user_environment_secret"),
    )

    # Relationships
    user = relationship("User", back_populates="secrets")
    environment = relationship("Environment", back_populates="secrets")

    def __repr__(self) -> str:
        return f"<UserSecret user={self.user_id} env={self.environment_id}>"
