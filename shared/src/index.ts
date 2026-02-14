/**
 * Shared package entry point.
 * Re-exports all types and API functions for web and mobile to consume.
 */

// Types
export type * from "./types/auth";
export type * from "./types/service";
export type * from "./types/swagger";
export type * from "./types/secrets";

// API client setup
export { initApiClient, getApiClient, getTokenStorage } from "./api/client";
export type { TokenStorage } from "./api/client";

// API calls
export * as authApi from "./api/auth";
export * as servicesApi from "./api/services";
export * as swaggerApi from "./api/swagger";
export * as secretsApi from "./api/secrets";
