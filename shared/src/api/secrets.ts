/**
 * Secrets and JWT generation API calls.
 */

import { getApiClient } from "./client";
import type {
  SecretSave,
  SecretStatus,
  JwtGenerateRequest,
  JwtGenerateResponse,
} from "../types/secrets";

/** Check which secrets exist for an environment */
export async function getSecretStatus(environmentId: string): Promise<SecretStatus> {
  const client = getApiClient();
  const response = await client.get<SecretStatus>(`/api/secrets/${environmentId}`);
  return response.data;
}

/** Save or update secrets for an environment */
export async function saveSecrets(
  environmentId: string,
  data: SecretSave
): Promise<SecretStatus> {
  const client = getApiClient();
  const response = await client.put<SecretStatus>(
    `/api/secrets/${environmentId}`,
    data
  );
  return response.data;
}

/** Delete all secrets for an environment */
export async function deleteSecrets(environmentId: string): Promise<void> {
  const client = getApiClient();
  await client.delete(`/api/secrets/${environmentId}`);
}

/** Generate a JWT token using stored jwt_secret */
export async function generateJwt(data: JwtGenerateRequest): Promise<JwtGenerateResponse> {
  const client = getApiClient();
  const response = await client.post<JwtGenerateResponse>("/api/jwt/generate", data);
  return response.data;
}
