/**
 * Auth-related TypeScript types.
 * Shared between web and mobile frontends.
 */

/** Request body for user registration */
export interface RegisterRequest {
  email: string;
  password: string;
}

/** Request body for user login */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Response containing JWT access token */
export interface TokenResponse {
  access_token: string;
  token_type: string;
}

/** Public user info */
export interface User {
  id: string;
  email: string;
  created_at: string;
}
