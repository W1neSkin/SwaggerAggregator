/**
 * Swagger/OpenAPI API calls.
 */

import { getApiClient } from "./client";
import type { SwaggerSpecResponse, EndpointInfo, SwaggerType } from "../types/swagger";

/** Fetch the OpenAPI spec for an environment */
export async function getSwaggerSpec(
  environmentId: string,
  type: SwaggerType = "main"
): Promise<SwaggerSpecResponse> {
  const client = getApiClient();
  const response = await client.get<SwaggerSpecResponse>(
    `/api/swagger/${environmentId}`,
    { params: { type } }
  );
  return response.data;
}

/** Get parsed endpoints list from the OpenAPI spec */
export async function getEndpoints(
  environmentId: string,
  type: SwaggerType = "main"
): Promise<EndpointInfo[]> {
  const client = getApiClient();
  const response = await client.get<EndpointInfo[]>(
    `/api/swagger/${environmentId}/endpoints`,
    { params: { type } }
  );
  return response.data;
}

/** Force re-fetch the OpenAPI spec from the remote service */
export async function refreshSwaggerSpec(
  environmentId: string,
  type: SwaggerType = "main"
): Promise<SwaggerSpecResponse> {
  const client = getApiClient();
  const response = await client.post<SwaggerSpecResponse>(
    `/api/swagger/${environmentId}/refresh`,
    null,
    { params: { type } }
  );
  return response.data;
}
