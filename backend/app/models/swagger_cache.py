"""
SwaggerCache model.
Caches fetched OpenAPI specs to avoid hitting remote services every request.
Specs are refreshed on demand or when TTL expires.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SwaggerCache(Base):
    """Cached OpenAPI specification for an environment."""

    __tablename__ = "swagger_cache"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    environment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("environments.id", ondelete="CASCADE"), nullable=False
    )
    # "main" or "admin" swagger type
    swagger_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )
    # The full OpenAPI spec as JSON
    spec_json: Mapped[dict] = mapped_column(
        JSONB, nullable=True
    )
    # When the spec was last fetched from the remote service
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Only one cache entry per environment + swagger type
    __table_args__ = (
        UniqueConstraint("environment_id", "swagger_type", name="uq_env_swagger_type"),
    )

    # Relationships
    environment = relationship("Environment", back_populates="swagger_caches")

    def __repr__(self) -> str:
        return f"<SwaggerCache env={self.environment_id} type={self.swagger_type}>"
