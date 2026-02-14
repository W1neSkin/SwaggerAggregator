/**
 * Secrets and JWT generation TypeScript types.
 * Shared between web and mobile frontends.
 */

/** Request body for saving secrets */
export interface SecretSave {
  jwt_secret?: string;
  admin_password?: string;
}

/** Response showing which secrets exist (never returns actual values) */
export interface SecretStatus {
  environment_id: string;
  has_jwt_secret: boolean;
  has_admin_password: boolean;
}

/** Request body for generating a JWT token */
export interface JwtGenerateRequest {
  environment_id: string;
  user_id_value: string;
}

/** Response containing the generated JWT token */
export interface JwtGenerateResponse {
  token: string;
  payload: Record<string, unknown>;
}
