/**
 * Mobile token storage adapter.
 * Uses expo-secure-store for encrypted on-device storage.
 * Implements the TokenStorage interface from the shared package.
 *
 * Placeholder — will be fully implemented in Phase 6.
 */

import type { TokenStorage } from "@swagger-aggregator/shared";

const TOKEN_KEY = "swagger_aggregator_token";

/**
 * Secure token storage using expo-secure-store.
 * On iOS: uses Keychain, on Android: uses Keystore.
 */
export const mobileTokenStorage: TokenStorage = {
  async getToken(): Promise<string | null> {
    // Will use: await SecureStore.getItemAsync(TOKEN_KEY)
    return null;
  },

  async setToken(token: string): Promise<void> {
    // Will use: await SecureStore.setItemAsync(TOKEN_KEY, token)
  },

  async removeToken(): Promise<void> {
    // Will use: await SecureStore.deleteItemAsync(TOKEN_KEY)
  },
};
