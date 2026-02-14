/**
 * Swagger/OpenAPI related TypeScript types.
 * Shared between web and mobile frontends.
 */

/** Parsed endpoint info from an OpenAPI spec */
export interface EndpointInfo {
  method: string;
  path: string;
  summary: string;
  description: string;
  tags: string[];
  parameters: Record<string, unknown>[];
  request_body: Record<string, unknown> | null;
  responses: Record<string, unknown>;
  operation_id: string;
}

/** Full OpenAPI spec response from the backend */
export interface SwaggerSpecResponse {
  spec: Record<string, unknown>;
  fetched_at: string;
  source: string;
}

/** Swagger type: main API or admin API */
export type SwaggerType = "main" | "admin";
