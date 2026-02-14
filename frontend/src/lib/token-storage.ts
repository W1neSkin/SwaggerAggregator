/**
 * Web token storage adapter.
 * Uses localStorage to persist the JWT access token.
 * Implements the TokenStorage interface from the shared package.
 */

import type { TokenStorage } from "@swagger-aggregator/shared";

const TOKEN_KEY = "swagger_aggregator_token";

export const webTokenStorage: TokenStorage = {
  async getToken(): Promise<string | null> {
    return localStorage.getItem(TOKEN_KEY);
  },

  async setToken(token: string): Promise<void> {
    localStorage.setItem(TOKEN_KEY, token);
  },

  async removeToken(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY);
  },
};
