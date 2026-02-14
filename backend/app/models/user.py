"""
User model.
Stores registered users with hashed passwords and encryption salt.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, LargeBinary
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    """User account for the Swagger Aggregator."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    password_hash: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    # Per-user salt for deriving encryption key (used to encrypt secrets)
    encryption_salt: Mapped[bytes] = mapped_column(
        LargeBinary(32), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    services = relationship("Service", back_populates="creator", lazy="selectin")
    secrets = relationship("UserSecret", back_populates="user", lazy="selectin")

    def __repr__(self) -> str:
        return f"<User {self.email}>"
