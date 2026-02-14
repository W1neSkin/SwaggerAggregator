"""
Proxy execution Pydantic schemas.
Used for forwarding API requests to target services.
"""

from pydantic import BaseModel


class ProxyRequest(BaseModel):
    """Request body for executing an API call through the proxy."""
    # Target request details
    url: str                                    # Full URL to call
    method: str = "GET"                         # HTTP method
    headers: dict[str, str] = {}                # Custom headers
    query_params: dict[str, str] = {}           # Query parameters
    body: dict | list | str | None = None       # Request body (JSON or string)

    # Auth helpers (optional, applied automatically)
    environment_id: str | None = None           # To look up stored secrets
    auth_mode: str | None = None                # "jwt" | "admin" | "none" | None
    jwt_token: str | None = None                # Pre-generated JWT token
    admin_password: str | None = None           # Admin password (on-the-fly)


class ProxyResponse(BaseModel):
    """Response from the proxied API call."""
    status_code: int
    headers: dict[str, str]
    body: str                                   # Raw response body
    elapsed_ms: int                             # Request duration in milliseconds
    request_url: str = ""                       # Actual URL that was called (debug)
