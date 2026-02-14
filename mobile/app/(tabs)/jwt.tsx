/**
 * JWT Generator screen.
 * Supports both stored and on-the-fly secret input.
 * Theme-aware.
 */

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useQuery } from "@tanstack/react-query";
import { servicesApi, secretsApi } from "@swagger-aggregator/shared";
import type { Service, Environment } from "@swagger-aggregator/shared";
import { useTheme } from "../../lib/ThemeContext";

export default function JwtScreen() {
  const { colors } = useTheme();
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedEnvId, setSelectedEnvId] = useState("");
  const [userId, setUserId] = useState("");
  const [secretMode, setSecretMode] = useState<"stored" | "manual">("stored");
  const [manualSecret, setManualSecret] = useState("");
  const [generatedToken, setGeneratedToken] = useState("");
  const [tokenPayload, setTokenPayload] = useState<Record<string, unknown> | null>(null);

  // Fetch services
  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.listServices(),
  });

  // Fetch environments
  const { data: environments } = useQuery({
    queryKey: ["environments", selectedServiceId],
    queryFn: () => servicesApi.listEnvironments(selectedServiceId),
    enabled: !!selectedServiceId,
  });

  // Check secret status
  const { data: secretStatus } = useQuery({
    queryKey: ["secretStatus", selectedEnvId],
    queryFn: () => secretsApi.getSecretStatus(selectedEnvId),
    enabled: !!selectedEnvId,
  });

  const handleGenerate = async () => {
    if (!selectedEnvId || !userId) {
      Alert.alert("Error", "Please select an environment and enter a user ID");
      return;
    }
    if (secretMode === "manual" && !manualSecret.trim()) {
      Alert.alert("Error", "Please enter a JWT secret");
      return;
    }

    try {
      const result = await secretsApi.generateJwt({
        environment_id: selectedEnvId,
        user_id_value: userId,
        ...(secretMode === "manual" ? { jwt_secret: manualSecret } : {}),
      });
      setGeneratedToken(result.token);
      setTokenPayload(result.payload);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.detail || "Failed to generate JWT");
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(generatedToken);
    Alert.alert("Copied", "Token copied to clipboard");
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.desc, { color: colors.textSecondary }]}>
        Generate JWT tokens for external services.
      </Text>

      {/* Service picker */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Service</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {services?.map((svc: Service) => (
          <TouchableOpacity
            key={svc.id}
            style={[
              styles.chip,
              { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
              selectedServiceId === svc.id && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => { setSelectedServiceId(svc.id); setSelectedEnvId(""); }}
          >
            <Text style={[
              styles.chipText,
              { color: colors.text },
              selectedServiceId === svc.id && { color: "#fff" },
            ]}>
              {svc.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Environment picker */}
      {selectedServiceId ? (
        <>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Environment</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {environments?.map((env: Environment) => (
              <TouchableOpacity
                key={env.id}
                style={[
                  styles.chip,
                  { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
                  selectedEnvId === env.id && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setSelectedEnvId(env.id)}
              >
                <Text style={[
                  styles.chipText,
                  { color: colors.text },
                  selectedEnvId === env.id && { color: "#fff" },
                ]}>
                  {env.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      ) : null}

      {/* User ID */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>User ID (JWT "sub" claim)</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg, color: colors.text }]}
        placeholder="e.g., 550e8400-e29b-..."
        value={userId}
        onChangeText={setUserId}
        placeholderTextColor={colors.textMuted}
      />

      {/* Secret mode toggle */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>JWT Secret Source</Text>
      <View style={[styles.toggle, { backgroundColor: colors.toggleBg }]}>
        <TouchableOpacity
          style={[styles.toggleBtn, secretMode === "stored" && [styles.toggleActive, { backgroundColor: colors.toggleActive }]]}
          onPress={() => setSecretMode("stored")}
        >
          <Text style={[styles.toggleText, { color: colors.textMuted }, secretMode === "stored" && { color: colors.text }]}>
            Stored
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, secretMode === "manual" && [styles.toggleActive, { backgroundColor: colors.toggleActive }]]}
          onPress={() => setSecretMode("manual")}
        >
          <Text style={[styles.toggleText, { color: colors.textMuted }, secretMode === "manual" && { color: colors.text }]}>
            Enter Manually
          </Text>
        </TouchableOpacity>
      </View>

      {/* Secret status or manual input */}
      {secretMode === "stored" && selectedEnvId ? (
        <Text style={{ fontSize: 12, color: secretStatus?.has_jwt_secret ? colors.green700 : colors.warning, marginBottom: 12 }}>
          {secretStatus?.has_jwt_secret ? "jwt_secret is saved" : "No jwt_secret saved for this environment"}
        </Text>
      ) : null}

      {secretMode === "manual" ? (
        <>
          <TextInput
            style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg, color: colors.text }]}
            placeholder="Enter jwt_secret (will NOT be stored)"
            value={manualSecret}
            onChangeText={setManualSecret}
            secureTextEntry
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[styles.hint, { color: colors.textMuted }]}>Used only for this request. Not saved anywhere.</Text>
        </>
      ) : null}

      {/* Generate button */}
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleGenerate}>
        <Text style={styles.buttonText}>Generate JWT</Text>
      </TouchableOpacity>

      {/* Result */}
      {generatedToken ? (
        <View style={[styles.result, { backgroundColor: colors.card }]}>
          <View style={styles.resultHeader}>
            <Text style={[styles.resultLabel, { color: colors.text }]}>Generated Token</Text>
            <TouchableOpacity onPress={handleCopy}>
              <Text style={[styles.copyBtn, { color: colors.primary }]}>Copy</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.token, { color: colors.text, backgroundColor: colors.gray50 }]} selectable numberOfLines={6}>
            {generatedToken}
          </Text>
          {tokenPayload ? (
            <>
              <Text style={[styles.resultLabel, { marginTop: 12, color: colors.text }]}>Payload</Text>
              <Text style={[styles.payload, { color: colors.text, backgroundColor: colors.gray50 }]} selectable>
                {JSON.stringify(tokenPayload, null, 2)}
              </Text>
            </>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  desc: { fontSize: 14, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  chips: { marginBottom: 16, flexGrow: 0 },
  chip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  chipText: { fontSize: 14 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 12 },
  hint: { fontSize: 11, marginTop: -8, marginBottom: 12 },
  toggle: { flexDirection: "row", borderRadius: 8, padding: 3, marginBottom: 12 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  toggleActive: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  toggleText: { fontSize: 13, fontWeight: "500" },
  button: { borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  result: { marginTop: 20, borderRadius: 12, padding: 16 },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultLabel: { fontSize: 13, fontWeight: "600" },
  copyBtn: { fontSize: 13, fontWeight: "600" },
  token: { marginTop: 8, fontSize: 11, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", padding: 10, borderRadius: 8 },
  payload: { marginTop: 8, fontSize: 11, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", padding: 10, borderRadius: 8 },
});
