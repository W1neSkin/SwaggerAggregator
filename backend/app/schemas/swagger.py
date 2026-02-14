"""Swagger/OpenAPI related Pydantic schemas."""

from pydantic import BaseModel


class EndpointInfo(BaseModel):
    """Parsed endpoint info from an OpenAPI spec."""
    method: str          # GET, POST, PUT, DELETE, etc.
    path: str            # /api/users/{id}
    summary: str = ""    # Short description
    description: str = ""  # Full description
    tags: list[str] = []
    parameters: list[dict] = []     # Query/path/header parameters
    request_body: dict | None = None  # Request body schema
    responses: dict = {}  # Response schemas by status code
    operation_id: str = ""


class SwaggerSpecResponse(BaseModel):
    """Full OpenAPI spec returned from cache or remote."""
    spec: dict  # The full OpenAPI JSON spec
    fetched_at: str  # ISO timestamp of when it was fetched
    source: str  # "cache" or "remote"
