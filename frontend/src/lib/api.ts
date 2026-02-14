/**
 * API client initialization for the web frontend.
 * Sets up the shared API client with web-specific token storage.
 */

import { initApiClient } from "@swagger-aggregator/shared";
import { webTokenStorage } from "./token-storage";

// In development, Vite proxy handles /api -> backend
// In production, use the configured API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

/** Initialize the API client — call this once at app startup */
export function setupApi() {
  initApiClient(API_BASE_URL, webTokenStorage);
}
