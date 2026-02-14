/**
 * Login / Register screen.
 * Allows users to sign in or create a new account.
 * Theme-aware.
 */

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@swagger-aggregator/shared";
import type { LoginRequest, RegisterRequest } from "@swagger-aggregator/shared";
import { useTheme } from "../../lib/ThemeContext";

export default function LoginScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest | RegisterRequest) =>
      isRegister ? authApi.register(data) : authApi.login(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      router.replace("/(tabs)");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || "Something went wrong";
      Alert.alert("Error", msg);
    },
  });

  const handleSubmit = () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }
    loginMutation.mutate({ email, password });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.inner}>
        {/* Header */}
        <Text style={[styles.title, { color: colors.primary }]}>Swagger Aggregator</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Manage all your service APIs from one place
        </Text>

        {/* Form */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {isRegister ? "Create Account" : "Sign In"}
          </Text>

          <TextInput
            style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={colors.textMuted}
          />

          <TextInput
            style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={colors.textMuted}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loginMutation.isPending && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loginMutation.isPending}
          >
            <Text style={styles.buttonText}>
              {loginMutation.isPending
                ? "Loading..."
                : isRegister
                ? "Create Account"
                : "Sign In"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsRegister(!isRegister)}
            style={styles.toggleBtn}
          >
            <Text style={[styles.toggleText, { color: colors.primary }]}>
              {isRegister
                ? "Already have an account? Sign in"
                : "Don't have an account? Create one"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  title: { fontSize: 28, fontWeight: "bold", textAlign: "center" },
  subtitle: { fontSize: 14, textAlign: "center", marginTop: 8, marginBottom: 32 },
  card: { borderRadius: 16, padding: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 20, fontWeight: "600", marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 12 },
  button: { borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  toggleBtn: { marginTop: 20, alignItems: "center" },
  toggleText: { fontSize: 14 },
});
