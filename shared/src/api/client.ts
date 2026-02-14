/**
 * Base API client using axios.
 * Configurable token storage adapter so web and mobile can plug in
 * their own storage mechanism (localStorage vs expo-secure-store).
 */

import axios from "axios";
import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";

/**
 * Token storage interface.
 * Web implements this with localStorage, mobile with expo-secure-store.
 */
export interface TokenStorage {
  getToken(): Promise<string | null>;
  setToken(token: string): Promise<void>;
  removeToken(): Promise<void>;
}

/** Default API base URL (overridden per environment) */
const DEFAULT_BASE_URL = "http://localhost:8000";

/** Singleton API client reference */
let apiClient: AxiosInstance | null = null;
let tokenStorage: TokenStorage | null = null;

/**
 * Initialize the API client with a base URL and token storage adapter.
 * Must be called once at app startup.
 */
export function initApiClient(baseUrl?: string, storage?: TokenStorage): AxiosInstance {
  tokenStorage = storage ?? null;

  apiClient = axios.create({
    baseURL: baseUrl || DEFAULT_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });

  // Request interceptor: attach auth token to every request
  apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    if (tokenStorage) {
      const token = await tokenStorage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });

  // Response interceptor: handle 401 errors (token expired)
  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401 && tokenStorage) {
        // Token expired or invalid — clear it
        await tokenStorage.removeToken();
      }
      return Promise.reject(error);
    }
  );

  return apiClient;
}

/**
 * Get the current API client instance.
 * Throws if initApiClient() hasn't been called yet.
 */
export function getApiClient(): AxiosInstance {
  if (!apiClient) {
    throw new Error("API client not initialized. Call initApiClient() first.");
  }
  return apiClient;
}

/**
 * Get the current token storage adapter.
 */
export function getTokenStorage(): TokenStorage | null {
  return tokenStorage;
}
