"""
Environment model.
Represents a deployment environment for a service (local, dev, stage, prod).
Each environment has its own base URL and swagger paths.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Environment(Base):
    """A deployment environment for a service."""

    __tablename__ = "environments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    service_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("services.id", ondelete="CASCADE"), nullable=False
    )
    # Environment name: "local", "dev", "stage", "prod"
    name: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    # Base URL of the service in this environment
    # Example: "http://localhost:8000", "https://api-dev.example.com"
    base_url: Mapped[str] = mapped_column(
        String(500), nullable=False
    )
    # Path to the main OpenAPI spec (default: /openapi.json)
    swagger_path: Mapped[str] = mapped_column(
        String(255), nullable=False, default="/openapi.json"
    )
    # Path to the admin OpenAPI spec (default: /admin/openapi.json)
    admin_swagger_path: Mapped[str] = mapped_column(
        String(255), nullable=False, default="/admin/openapi.json"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    service = relationship("Service", back_populates="environments")
    secrets = relationship(
        "UserSecret", back_populates="environment", cascade="all, delete-orphan", lazy="selectin"
    )
    swagger_caches = relationship(
        "SwaggerCache", back_populates="environment", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Environment {self.name} @ {self.base_url}>"
