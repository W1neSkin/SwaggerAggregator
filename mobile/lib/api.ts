/**
 * API client initialization for the mobile app.
 * Uses expo-secure-store for token storage.
 */

import { initApiClient } from "@swagger-aggregator/shared";
import { mobileTokenStorage } from "./token-storage";

// Default to localhost for development.
// In production, this should be the deployed backend URL.
// On Android emulator, use 10.0.2.2 instead of localhost.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:8000";

/** Initialize the API client — call once at app startup */
export function setupApi() {
  initApiClient(API_BASE_URL, mobileTokenStorage);
}
