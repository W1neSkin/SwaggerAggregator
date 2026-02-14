"""
Application configuration.
Loads settings from environment variables with sensible defaults.
Uses pydantic-settings for validation and type coercion.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Main application settings loaded from environment variables."""

    # --- Database ---
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/swagger_aggregator"

    # --- Auth (JWT for the aggregator itself) ---
    SECRET_KEY: str = "change-me-to-a-random-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # --- Encryption (for storing user secrets like jwt_secret, admin_password) ---
    MASTER_ENCRYPTION_KEY: str = "change-me-to-a-random-master-key"

    # --- CORS ---
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:19006"

    # --- Server ---
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        # Look for .env in parent directory (project root) as well
        extra = "ignore"


# Singleton settings instance
settings = Settings()
