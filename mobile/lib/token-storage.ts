/**
 * Mobile token storage adapter using expo-secure-store.
 * On iOS: uses Keychain (hardware-encrypted).
 * On Android: uses Keystore (hardware-backed encryption).
 * Implements the TokenStorage interface from the shared package.
 */

import * as SecureStore from "expo-secure-store";
import type { TokenStorage } from "@swagger-aggregator/shared";

const TOKEN_KEY = "swagger_aggregator_token";

export const mobileTokenStorage: TokenStorage = {
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  async removeToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
