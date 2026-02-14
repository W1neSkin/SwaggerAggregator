/**
 * Service Detail screen — redesigned.
 * Grouped endpoint list with compact method+path rows.
 * Tap an endpoint to navigate to its detail screen.
 * Includes per-environment secret management inline.
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
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { servicesApi, swaggerApi, secretsApi } from "@swagger-aggregator/shared";
import type { Environment, EndpointInfo, SwaggerType } from "@swagger-aggregator/shared";
import { useTheme } from "../../lib/ThemeContext";
import { methodColors } from "../../lib/colors";
import { Ionicons } from "@expo/vector-icons";

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  const [selectedEnvId, setSelectedEnvId] = useState("");
  const [swaggerType, setSwaggerType] = useState<SwaggerType>("main");
  const [showAddEnv, setShowAddEnv] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  // New environment form
  const [envName, setEnvName] = useState("");
  const [envBaseUrl, setEnvBaseUrl] = useState("");
  const [envSwaggerPath, setEnvSwaggerPath] = useState("/docs/openapi.json");
  const [envAdminPath, setEnvAdminPath] = useState("/admin/docs/openapi.json");

  // Secrets form
  const [jwtSecret, setJwtSecret] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // Fetch service
  const { data: service } = useQuery({
    queryKey: ["service", id],
    queryFn: () => servicesApi.getService(id!),
    enabled: !!id,
  });

  // Fetch environments
  const { data: environments } = useQuery({
    queryKey: ["environments", id],
    queryFn: () => servicesApi.listEnvironments(id!),
    enabled: !!id,
  });

  // Fetch endpoints for selected environment
  const {
    data: endpoints,
    isLoading: loadingEndpoints,
    error: endpointsError,
  } = useQuery({
    queryKey: ["endpoints", selectedEnvId, swaggerType],
    queryFn: () => swaggerApi.getEndpoints(selectedEnvId, swaggerType),
    enabled: !!selectedEnvId,
    retry: 1,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Secret status for selected environment
  const { data: secretStatus } = useQuery({
    queryKey: ["secretStatus", selectedEnvId],
    queryFn: () => secretsApi.getSecretStatus(selectedEnvId),
    enabled: !!selectedEnvId,
  });

  // Create environment mutation
  const createEnvMutation = useMutation({
    mutationFn: () =>
      servicesApi.createEnvironment(id!, {
        name: envName,
        base_url: envBaseUrl,
        swagger_path: envSwaggerPath || undefined,
        admin_swagger_path: envAdminPath || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["environments", id] });
      setShowAddEnv(false);
      setEnvName("");
      setEnvBaseUrl("");
    },
    onError: (err: any) =>
      Alert.alert("Error", err?.response?.data?.detail || "Failed to create"),
  });

  // Delete environment
  const deleteEnvMutation = useMutation({
    mutationFn: (envId: string) => servicesApi.deleteEnvironment(envId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["environments", id] });
      setSelectedEnvId("");
    },
  });

  // Delete service
  const deleteServiceMutation = useMutation({
    mutationFn: () => servicesApi.deleteService(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      router.back();
    },
  });

  // Get selected environment for base_url
  const selectedEnv = environments?.find((env: Environment) => env.id === selectedEnvId);

  // Save secrets handler
  const handleSaveSecrets = async () => {
    if (!selectedEnvId) return;
    const data: { jwt_secret?: string; admin_password?: string } = {};
    if (jwtSecret.trim()) data.jwt_secret = jwtSecret;
    if (adminPassword.trim()) data.admin_password = adminPassword;
    if (Object.keys(data).length === 0) { Alert.alert("Error", "Enter at least one secret"); return; }
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

  /** Navigate to endpoint detail screen */
  const openEndpoint = (ep: EndpointInfo, index: number) => {
    // Store the endpoint data in a query param (compact)
    router.push({
      pathname: "/service/endpoint",
      params: {
        endpointData: JSON.stringify(ep),
        baseUrl: selectedEnv?.base_url || "",
        environmentId: selectedEnvId,
        swaggerType,
      },
    });
  };

  /** Get color scheme for HTTP method badge */
  const getMethodColor = (method: string) =>
    methodColors[method.toUpperCase()] || { bg: colors.gray100, text: colors.text };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Stack.Screen options={{ title: service?.name || "Service" }} />

      {/* Service header */}
      {service ? (
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.serviceName, { color: colors.text }]}>{service.name}</Text>
            {service.description ? (
              <Text style={[styles.serviceDesc, { color: colors.textSecondary }]}>{service.description}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() =>
              Alert.alert("Delete Service", `Delete "${service.name}" and all data?`, [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => deleteServiceMutation.mutate() },
              ])
            }
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Environments section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Environments</Text>
          <TouchableOpacity onPress={() => setShowAddEnv(!showAddEnv)}>
            <Text style={[styles.addText, { color: colors.primary }]}>{showAddEnv ? "Cancel" : "+ Add"}</Text>
          </TouchableOpacity>
        </View>

        {/* Add environment form */}
        {showAddEnv ? (
          <View style={[styles.addForm, { backgroundColor: colors.card }]}>
            <TextInput style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]} placeholder="Name (e.g. local, dev)" value={envName} onChangeText={setEnvName} placeholderTextColor={colors.textMuted} />
            <TextInput style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]} placeholder="Base URL" value={envBaseUrl} onChangeText={setEnvBaseUrl} autoCapitalize="none" placeholderTextColor={colors.textMuted} />
            <TextInput style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]} placeholder="Swagger path" value={envSwaggerPath} onChangeText={setEnvSwaggerPath} autoCapitalize="none" placeholderTextColor={colors.textMuted} />
            <TextInput style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]} placeholder="Admin swagger path" value={envAdminPath} onChangeText={setEnvAdminPath} autoCapitalize="none" placeholderTextColor={colors.textMuted} />
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={() => createEnvMutation.mutate()}>
              <Text style={styles.submitBtnText}>{createEnvMutation.isPending ? "Creating..." : "Create"}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Environment chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.envChips}>
          {environments?.map((env: Environment) => (
            <TouchableOpacity
              key={env.id}
              style={[
                styles.envChip,
                { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
                selectedEnvId === env.id && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setSelectedEnvId(env.id)}
              onLongPress={() =>
                Alert.alert("Delete Environment", `Delete "${env.name}"?`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => deleteEnvMutation.mutate(env.id) },
                ])
              }
            >
              <Text style={[styles.envChipText, { color: colors.text }, selectedEnvId === env.id && { color: "#fff" }]}>
                {env.name}
              </Text>
              <Text style={{ fontSize: 10, color: selectedEnvId === env.id ? "rgba(255,255,255,0.7)" : colors.textMuted, marginTop: 2 }}>
                {env.base_url.replace(/https?:\/\//, "").split("/")[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {environments?.length ? (
          <Text style={[styles.hint, { color: colors.textMuted }]}>Long press to delete</Text>
        ) : null}
      </View>

      {/* Secret management (per-environment) */}
      {selectedEnvId ? (
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.secretsToggle, { backgroundColor: colors.card }]}
            onPress={() => setShowSecrets(!showSecrets)}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="key-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.secretsToggleText, { color: colors.text }]}>Secrets</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {/* Status dots */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={[styles.statusDot, { backgroundColor: secretStatus?.has_jwt_secret ? colors.success : colors.gray200 }]} />
                <Text style={{ fontSize: 10, color: colors.textMuted }}>JWT</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={[styles.statusDot, { backgroundColor: secretStatus?.has_admin_password ? colors.success : colors.gray200 }]} />
                <Text style={{ fontSize: 10, color: colors.textMuted }}>Admin</Text>
              </View>
              <Ionicons name={showSecrets ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {showSecrets && (
            <View style={[styles.secretsForm, { backgroundColor: colors.card }]}>
              <TextInput
                style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
                placeholder="JWT secret (leave empty to keep)"
                value={jwtSecret}
                onChangeText={setJwtSecret}
                secureTextEntry
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
                placeholder="Admin password (leave empty to keep)"
                value={adminPassword}
                onChangeText={setAdminPassword}
                secureTextEntry
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleSaveSecrets}>
                <Text style={styles.submitBtnText}>Save Secrets</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : null}

      {/* Swagger type toggle */}
      {selectedEnvId ? (
        <View style={styles.section}>
          <View style={[styles.toggle, { backgroundColor: colors.toggleBg }]}>
            <TouchableOpacity
              style={[styles.toggleBtn, swaggerType === "main" && [styles.toggleActive, { backgroundColor: colors.toggleActive }]]}
              onPress={() => setSwaggerType("main")}
            >
              <Text style={[styles.toggleText, { color: colors.textMuted }, swaggerType === "main" && { color: colors.text, fontWeight: "600" }]}>
                API
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, swaggerType === "admin" && [styles.toggleActive, { backgroundColor: colors.toggleActive }]]}
              onPress={() => setSwaggerType("admin")}
            >
              <Text style={[styles.toggleText, { color: colors.textMuted }, swaggerType === "admin" && { color: colors.text, fontWeight: "600" }]}>
                Admin API
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Endpoints list — compact rows, tap to open detail */}
      {selectedEnvId ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Endpoints {endpoints?.length ? `(${endpoints.length})` : ""}
          </Text>

          {loadingEndpoints ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />
          ) : endpointsError ? (
            <View style={[styles.errorBox, { backgroundColor: colors.red50 }]}>
              <Text style={[styles.errorText, { color: colors.red700 }]}>Failed to load endpoints. Check that the service is running.</Text>
            </View>
          ) : !endpoints?.length ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No endpoints found</Text>
          ) : (
            <View style={[styles.endpointList, { backgroundColor: colors.card }]}>
              {endpoints.map((ep: EndpointInfo, index: number) => {
                const mc = getMethodColor(ep.method);
                const isLast = index === endpoints.length - 1;
                return (
                  <TouchableOpacity
                    key={`${ep.method}-${ep.path}-${index}`}
                    style={[
                      styles.endpointRow,
                      !isLast && { borderBottomWidth: 1, borderBottomColor: colors.separator },
                    ]}
                    onPress={() => openEndpoint(ep, index)}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.methodBadge, { backgroundColor: mc.bg }]}>
                      <Text style={[styles.methodText, { color: mc.text }]}>
                        {ep.method.toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.pathText, { color: colors.text }]} numberOfLines={1}>
                        {ep.path}
                      </Text>
                      {ep.summary ? (
                        <Text style={[styles.summaryText, { color: colors.textMuted }]} numberOfLines={1}>
                          {ep.summary}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 60 },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  serviceName: { fontSize: 22, fontWeight: "bold" },
  serviceDesc: { fontSize: 13, marginTop: 4 },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "600" },
  addText: { fontSize: 14, fontWeight: "600" },
  addForm: { borderRadius: 10, padding: 14, marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 8 },
  submitBtn: { borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 4 },
  submitBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  envChips: { flexGrow: 0, marginBottom: 4 },
  envChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, minWidth: 80 },
  envChipText: { fontSize: 14, fontWeight: "500" },
  hint: { fontSize: 11, marginTop: 4 },
  /* Secrets toggle */
  secretsToggle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderRadius: 10, marginBottom: 4 },
  secretsToggleText: { fontSize: 14, fontWeight: "600" },
  secretsForm: { borderRadius: 10, padding: 14, marginBottom: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  /* Swagger toggle */
  toggle: { flexDirection: "row", borderRadius: 8, padding: 3, marginBottom: 4 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  toggleActive: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  toggleText: { fontSize: 13, fontWeight: "500" },
  /* Endpoints */
  errorBox: { borderRadius: 8, padding: 12, marginTop: 8 },
  errorText: { fontSize: 13 },
  emptyText: { fontSize: 13, marginTop: 12 },
  endpointList: { borderRadius: 12, overflow: "hidden" },
  endpointRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12 },
  methodBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, marginRight: 10, minWidth: 50, alignItems: "center" },
  methodText: { fontSize: 11, fontWeight: "700", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  pathText: { fontSize: 13, fontWeight: "500", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  summaryText: { fontSize: 11, marginTop: 2 },
});
