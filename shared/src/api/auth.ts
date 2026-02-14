/**
 * Auth API calls.
 * Registration, login, and current user info.
 */

import { getApiClient, getTokenStorage } from "./client";
import type { RegisterRequest, LoginRequest, TokenResponse, User } from "../types/auth";

/** Register a new user and store the token */
export async function register(data: RegisterRequest): Promise<TokenResponse> {
  const client = getApiClient();
  const response = await client.post<TokenResponse>("/api/auth/register", data);
  // Store the token
  const storage = getTokenStorage();
  if (storage) {
    await storage.setToken(response.data.access_token);
  }
  return response.data;
}

/** Login and store the token */
export async function login(data: LoginRequest): Promise<TokenResponse> {
  const client = getApiClient();
  const response = await client.post<TokenResponse>("/api/auth/login", data);
  // Store the token
  const storage = getTokenStorage();
  if (storage) {
    await storage.setToken(response.data.access_token);
  }
  return response.data;
}

/** Get the current user's info */
export async function getMe(): Promise<User> {
  const client = getApiClient();
  const response = await client.get<User>("/api/auth/me");
  return response.data;
}

/** Logout: remove stored token */
export async function logout(): Promise<void> {
  const storage = getTokenStorage();
  if (storage) {
    await storage.removeToken();
  }
}
