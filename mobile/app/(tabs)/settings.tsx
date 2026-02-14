/**
 * Settings screen.
 * Manage secrets per environment + logout.
 * Storage is optional — user can enter secrets on-the-fly in JWT Generator.
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
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { servicesApi, secretsApi, authApi } from "@swagger-aggregator/shared";
import type { Service, Environment } from "@swagger-aggregator/shared";
import { colors } from "../../lib/colors";

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedEnvId, setSelectedEnvId] = useState("");
  const [jwtSecret, setJwtSecret] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

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

  // Secret status
  const { data: secretStatus } = useQuery({
    queryKey: ["secretStatus", selectedEnvId],
    queryFn: () => secretsApi.getSecretStatus(selectedEnvId),
    enabled: !!selectedEnvId,
  });

  // Logout
  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.clear();
      router.replace("/(auth)/login");
    },
  });

  const handleSave = async () => {
    if (!selectedEnvId) {
      Alert.alert("Error", "Please select an environment");
      return;
    }

    const data: { jwt_secret?: string; admin_password?: string } = {};
    if (jwtSecret.trim()) data.jwt_secret = jwtSecret;
    if (adminPassword.trim()) data.admin_password = adminPassword;

    if (Object.keys(data).length === 0) {
      Alert.alert("Error", "Please enter at least one secret");
      return;
    }

    try {
      await secretsApi.saveSecrets(selectedEnvId, data);
      Alert.alert("Success", "Secrets saved!");
      setJwtSecret("");
      setAdminPassword("");
      queryClient.invalidateQueries({ queryKey: ["secretStatus", selectedEnvId] });
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.detail || "Failed to save");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>
          Storing secrets is optional. You can save them for some environments
          (e.g. local, dev) and enter manually for others (e.g. stage, prod).
        </Text>
      </View>

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

      {/* Secret status */}
      {secretStatus ? (
        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>Current Status:</Text>
          <Text style={{ fontSize: 13, color: secretStatus.has_jwt_secret ? colors.green[700] : colors.gray[400] }}>
            {secretStatus.has_jwt_secret ? "jwt_secret saved" : "jwt_secret not set"}
          </Text>
          <Text style={{ fontSize: 13, color: secretStatus.has_admin_password ? colors.green[700] : colors.gray[400] }}>
            {secretStatus.has_admin_password ? "admin_password saved" : "admin_password not set"}
          </Text>
        </View>
      ) : null}

      {/* Secret inputs */}
      <Text style={styles.label}>JWT Secret</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter jwt_secret (leave empty to keep current)"
        value={jwtSecret}
        onChangeText={setJwtSecret}
        secureTextEntry
        placeholderTextColor={colors.gray[400]}
      />

      <Text style={styles.label}>Admin Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter admin_password (leave empty to keep current)"
        value={adminPassword}
        onChangeText={setAdminPassword}
        secureTextEntry
        placeholderTextColor={colors.gray[400]}
      />

      {/* Save button */}
      <TouchableOpacity
        style={[styles.button, !selectedEnvId && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={!selectedEnvId}
      >
        <Text style={styles.buttonText}>Save Secrets</Text>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() =>
          Alert.alert("Logout", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Logout", style: "destructive", onPress: () => logoutMutation.mutate() },
          ])
        }
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  infoBanner: { backgroundColor: colors.blue[50], borderRadius: 10, padding: 12, marginBottom: 16 },
  infoText: { fontSize: 13, color: colors.blue[800], lineHeight: 18 },
  label: { fontSize: 13, fontWeight: "600", color: colors.gray[700], marginBottom: 6 },
  chips: { marginBottom: 16, flexGrow: 0 },
  chip: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray[200], borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, color: colors.gray[700] },
  chipTextActive: { color: colors.white },
  statusBox: { backgroundColor: colors.gray[50], borderRadius: 8, padding: 12, marginBottom: 16, gap: 4 },
  statusTitle: { fontSize: 13, fontWeight: "600", color: colors.gray[700], marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.gray[300], borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 12, backgroundColor: colors.white, color: colors.gray[900] },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 4, marginBottom: 24 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: "600" },
  logoutBtn: { borderWidth: 1, borderColor: colors.red[500], borderRadius: 10, paddingVertical: 14, alignItems: "center", marginBottom: 40 },
  logoutText: { color: colors.red[500], fontSize: 16, fontWeight: "600" },
});
