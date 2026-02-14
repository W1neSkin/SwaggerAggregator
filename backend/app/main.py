"""
Swagger Aggregator - FastAPI Application.
Main entry point that wires together all routers and middleware.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import auth, services, environments, swagger, secrets, jwt_generator


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Creates database tables on startup (for development).
    In production, use Alembic migrations instead.
    """
    # Create tables if they don't exist (dev convenience)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Cleanup on shutdown
    await engine.dispose()


# Create the FastAPI application
app = FastAPI(
    title="Swagger Aggregator API",
    description="Aggregate and manage Swagger/OpenAPI specs from multiple services and environments",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(auth.router)
app.include_router(services.router)
app.include_router(environments.router)
app.include_router(swagger.router)
app.include_router(secrets.router)
app.include_router(jwt_generator.router)


@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "ok", "service": "swagger-aggregator"}
