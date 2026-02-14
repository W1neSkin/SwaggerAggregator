/**
 * Proxy execution TypeScript types.
 * Used for forwarding API requests to target services.
 */

/** Request body for executing an API call through the proxy */
export interface ProxyRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  query_params?: Record<string, string>;
  body?: unknown;
  environment_id?: string;
  auth_mode?: "jwt" | "admin" | "none";
  jwt_token?: string;
  admin_password?: string;
}

/** Response from the proxied API call */
export interface ProxyResponse {
  status_code: number;
  headers: Record<string, string>;
  body: string;
  elapsed_ms: number;
  request_url?: string;             // Actual URL the proxy called (debug)
}
