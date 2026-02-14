/**
 * Auth hook for managing user authentication state.
 * Uses TanStack Query for data fetching and caching.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@swagger-aggregator/shared";
import type { LoginRequest, RegisterRequest } from "@swagger-aggregator/shared";

/** Hook to get the current authenticated user */
export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: () => authApi.getMe(),
    retry: false, // Don't retry on 401
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/** Hook for login mutation */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: () => {
      // Refetch current user after login
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
}

/** Hook for registration mutation */
export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
}

/** Hook for logout */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.clear(); // Clear all cached data
    },
  });
}
