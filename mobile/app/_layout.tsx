/**
 * Root layout for the mobile app.
 * Sets up React Query, API client, ThemeProvider, and auth-based navigation.
 * Redirects to login if not authenticated.
 */

import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { authApi } from "@swagger-aggregator/shared";
import { setupApi } from "../lib/api";
import { ThemeProvider, useTheme } from "../lib/ThemeContext";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

/** Auth guard: redirects to login or tabs based on auth state */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { colors } = useTheme();

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => authApi.getMe(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const isLoggedIn = !!user && !isError;

    if (!isLoggedIn && !inAuthGroup) {
      // Not logged in and not on auth screen -> go to login
      router.replace("/(auth)/login");
    } else if (isLoggedIn && inAuthGroup) {
      // Logged in but on auth screen -> go to tabs
      router.replace("/(tabs)");
    }
  }, [user, isLoading, isError, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

/** Inner component that uses theme for StatusBar */
function AppContent() {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <AuthGuard>
        <Slot />
      </AuthGuard>
    </>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setupApi();
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
