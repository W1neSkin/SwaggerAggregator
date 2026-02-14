/**
 * JWT Generator screen.
 * Supports both stored and on-the-fly secret input.
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
import { colors } from "../../lib/colors";

export default function JwtScreen() {
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.desc}>
        Generate JWT tokens for external services.
      </Text>

      {/* Service picker */}
      <Text style={styles.label}>Service</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {services?.map((svc: Service) => (
          <TouchableOpacity
            key={svc.id}
            style={[styles.chip, selectedServiceId === svc.id && styles.chipActive]}
            onPress={() => { setSelectedServiceId(svc.id); setSelectedEnvId(""); }}
          >
            <Text style={[styles.chipText, selectedServiceId === svc.id && styles.chipTextActive]}>
              {svc.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Environment picker */}
      {selectedServiceId ? (
        <>
          <Text style={styles.label}>Environment</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {environments?.map((env: Environment) => (
              <TouchableOpacity
                key={env.id}
                style={[styles.chip, selectedEnvId === env.id && styles.chipActive]}
                onPress={() => setSelectedEnvId(env.id)}
              >
                <Text style={[styles.chipText, selectedEnvId === env.id && styles.chipTextActive]}>
                  {env.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      ) : null}

      {/* User ID */}
      <Text style={styles.label}>User ID (JWT "sub" claim)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 550e8400-e29b-..."
        value={userId}
        onChangeText={setUserId}
        placeholderTextColor={colors.gray[400]}
      />

      {/* Secret mode toggle */}
      <Text style={styles.label}>JWT Secret Source</Text>
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, secretMode === "stored" && styles.toggleActive]}
          onPress={() => setSecretMode("stored")}
        >
          <Text style={[styles.toggleText, secretMode === "stored" && styles.toggleTextActive]}>
            Stored
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, secretMode === "manual" && styles.toggleActive]}
          onPress={() => setSecretMode("manual")}
        >
          <Text style={[styles.toggleText, secretMode === "manual" && styles.toggleTextActive]}>
            Enter Manually
          </Text>
        </TouchableOpacity>
      </View>

      {/* Secret status or manual input */}
      {secretMode === "stored" && selectedEnvId ? (
        <Text style={{ fontSize: 12, color: secretStatus?.has_jwt_secret ? colors.green[700] : colors.amber[600], marginBottom: 12 }}>
          {secretStatus?.has_jwt_secret ? "jwt_secret is saved" : "No jwt_secret saved for this environment"}
        </Text>
      ) : null}

      {secretMode === "manual" ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter jwt_secret (will NOT be stored)"
            value={manualSecret}
            onChangeText={setManualSecret}
            secureTextEntry
            placeholderTextColor={colors.gray[400]}
          />
          <Text style={styles.hint}>Used only for this request. Not saved anywhere.</Text>
        </>
      ) : null}

      {/* Generate button */}
      <TouchableOpacity style={styles.button} onPress={handleGenerate}>
        <Text style={styles.buttonText}>Generate JWT</Text>
      </TouchableOpacity>

      {/* Result */}
      {generatedToken ? (
        <View style={styles.result}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultLabel}>Generated Token</Text>
            <TouchableOpacity onPress={handleCopy}>
              <Text style={styles.copyBtn}>Copy</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.token} selectable numberOfLines={6}>
            {generatedToken}
          </Text>
          {tokenPayload ? (
            <>
              <Text style={[styles.resultLabel, { marginTop: 12 }]}>Payload</Text>
              <Text style={styles.payload} selectable>
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
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  desc: { fontSize: 14, color: colors.gray[500], marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", color: colors.gray[700], marginBottom: 6 },
  chips: { marginBottom: 16, flexGrow: 0 },
  chip: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray[200], borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, color: colors.gray[700] },
  chipTextActive: { color: colors.white },
  input: { borderWidth: 1, borderColor: colors.gray[300], borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 12, backgroundColor: colors.white, color: colors.gray[900] },
  hint: { fontSize: 11, color: colors.gray[400], marginTop: -8, marginBottom: 12 },
  toggle: { flexDirection: "row", backgroundColor: colors.gray[100], borderRadius: 8, padding: 3, marginBottom: 12 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  toggleActive: { backgroundColor: colors.white, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  toggleText: { fontSize: 13, fontWeight: "500", color: colors.gray[500] },
  toggleTextActive: { color: colors.gray[900] },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: "600" },
  result: { marginTop: 20, backgroundColor: colors.white, borderRadius: 12, padding: 16 },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultLabel: { fontSize: 13, fontWeight: "600", color: colors.gray[700] },
  copyBtn: { fontSize: 13, color: colors.primary, fontWeight: "600" },
  token: { marginTop: 8, fontSize: 11, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", color: colors.gray[800], backgroundColor: colors.gray[50], padding: 10, borderRadius: 8 },
  payload: { marginTop: 8, fontSize: 11, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", color: colors.gray[800], backgroundColor: colors.gray[50], padding: 10, borderRadius: 8 },
});
