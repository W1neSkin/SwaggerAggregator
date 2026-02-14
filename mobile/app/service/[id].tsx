/**
 * Service Detail screen.
 * Displays service info, environments, and endpoints.
 * Supports adding environments, viewing endpoints, toggling main/admin swagger.
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
import { servicesApi, swaggerApi } from "@swagger-aggregator/shared";
import type { Environment, EndpointInfo, SwaggerType } from "@swagger-aggregator/shared";
import { colors, methodColors } from "../../lib/colors";
import ExecutePanel from "../../components/ExecutePanel";

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedEnvId, setSelectedEnvId] = useState("");
  const [swaggerType, setSwaggerType] = useState<SwaggerType>("main");
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [executeEndpoint, setExecuteEndpoint] = useState<string | null>(null);
  const [showAddEnv, setShowAddEnv] = useState(false);

  // New environment form
  const [envName, setEnvName] = useState("");
  const [envBaseUrl, setEnvBaseUrl] = useState("");
  const [envSwaggerPath, setEnvSwaggerPath] = useState("/docs/openapi.json");
  const [envAdminPath, setEnvAdminPath] = useState("/admin/docs/openapi.json");

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

  // Delete environment mutation
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

  /** Toggle endpoint detail panel */
  const toggleEndpoint = (key: string) => {
    setExpandedEndpoint((prev) => (prev === key ? null : key));
  };

  /** Get color scheme for HTTP method badge */
  const getMethodColor = (method: string) =>
    methodColors[method.toUpperCase()] || { bg: colors.gray[100], text: colors.gray[800] };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Screen title */}
      <Stack.Screen options={{ title: service?.name || "Service" }} />

      {/* Service header */}
      {service ? (
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.serviceName}>{service.name}</Text>
            {service.description ? (
              <Text style={styles.serviceDesc}>{service.description}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() =>
              Alert.alert("Delete Service", `Delete "${service.name}" and all data?`, [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => deleteServiceMutation.mutate(),
                },
              ])
            }
          >
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Environments section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Environments</Text>
          <TouchableOpacity onPress={() => setShowAddEnv(!showAddEnv)}>
            <Text style={styles.addText}>{showAddEnv ? "Cancel" : "+ Add"}</Text>
          </TouchableOpacity>
        </View>

        {/* Add environment form */}
        {showAddEnv ? (
          <View style={styles.addForm}>
            <TextInput style={styles.input} placeholder="Name (e.g. local, dev)" value={envName} onChangeText={setEnvName} placeholderTextColor={colors.gray[400]} />
            <TextInput style={styles.input} placeholder="Base URL (e.g. http://localhost:8000)" value={envBaseUrl} onChangeText={setEnvBaseUrl} autoCapitalize="none" placeholderTextColor={colors.gray[400]} />
            <TextInput style={styles.input} placeholder="Swagger path (default: /docs/openapi.json)" value={envSwaggerPath} onChangeText={setEnvSwaggerPath} autoCapitalize="none" placeholderTextColor={colors.gray[400]} />
            <TextInput style={styles.input} placeholder="Admin swagger path" value={envAdminPath} onChangeText={setEnvAdminPath} autoCapitalize="none" placeholderTextColor={colors.gray[400]} />
            <TouchableOpacity style={styles.submitBtn} onPress={() => createEnvMutation.mutate()}>
              <Text style={styles.submitBtnText}>{createEnvMutation.isPending ? "Creating..." : "Create Environment"}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Environment chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.envChips}>
          {environments?.map((env: Environment) => (
            <TouchableOpacity
              key={env.id}
              style={[styles.envChip, selectedEnvId === env.id && styles.envChipActive]}
              onPress={() => setSelectedEnvId(env.id)}
              onLongPress={() =>
                Alert.alert("Delete Environment", `Delete "${env.name}"?`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => deleteEnvMutation.mutate(env.id) },
                ])
              }
            >
              <Text style={[styles.envChipText, selectedEnvId === env.id && styles.envChipTextActive]}>
                {env.name}
              </Text>
              <Text style={{ fontSize: 10, color: selectedEnvId === env.id ? colors.blue[100] : colors.gray[400], marginTop: 2 }}>
                {env.base_url}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {environments?.length ? (
          <Text style={styles.hint}>Long press on an environment to delete it</Text>
        ) : null}
      </View>

      {/* Swagger type toggle */}
      {selectedEnvId ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Swagger Type</Text>
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, swaggerType === "main" && styles.toggleActive]}
              onPress={() => setSwaggerType("main")}
            >
              <Text style={[styles.toggleText, swaggerType === "main" && styles.toggleTextActive]}>
                Main API
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, swaggerType === "admin" && styles.toggleActive]}
              onPress={() => setSwaggerType("admin")}
            >
              <Text style={[styles.toggleText, swaggerType === "admin" && styles.toggleTextActive]}>
                Admin API
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Endpoints list */}
      {selectedEnvId ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Endpoints</Text>

          {loadingEndpoints ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />
          ) : endpointsError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>Failed to load endpoints. Check that the service is running.</Text>
            </View>
          ) : !endpoints?.length ? (
            <Text style={styles.emptyText}>No endpoints found</Text>
          ) : (
            endpoints.map((ep: EndpointInfo, index: number) => {
              const key = `${ep.method}-${ep.path}-${index}`;
              const mc = getMethodColor(ep.method);
              const isExpanded = expandedEndpoint === key;

              return (
                <TouchableOpacity
                  key={key}
                  style={styles.endpoint}
                  onPress={() => toggleEndpoint(key)}
                  activeOpacity={0.7}
                >
                  {/* Method + Path */}
                  <View style={styles.endpointRow}>
                    <View style={[styles.methodBadge, { backgroundColor: mc.bg }]}>
                      <Text style={[styles.methodText, { color: mc.text }]}>
                        {ep.method.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.pathText} numberOfLines={isExpanded ? undefined : 1}>
                      {ep.path}
                    </Text>
                  </View>

                  {/* Summary */}
                  {ep.summary ? (
                    <Text style={styles.summary}>{ep.summary}</Text>
                  ) : null}

                  {/* Expanded details */}
                  {isExpanded ? (
                    <View style={styles.details}>
                      {ep.description ? (
                        <Text style={styles.detailText}>{ep.description}</Text>
                      ) : null}

                      {ep.tags.length > 0 ? (
                        <View style={styles.tagRow}>
                          {ep.tags.map((tag) => (
                            <View key={tag} style={styles.tag}>
                              <Text style={styles.tagText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      {ep.parameters.length > 0 ? (
                        <View style={{ marginTop: 8 }}>
                          <Text style={styles.detailLabel}>Parameters:</Text>
                          {ep.parameters.map((p: any, i: number) => (
                            <Text key={i} style={styles.paramText}>
                              • {p.name} ({p.in}) {p.required ? "*" : ""}
                            </Text>
                          ))}
                        </View>
                      ) : null}

                      {ep.request_body ? (
                        <View style={{ marginTop: 8 }}>
                          <Text style={styles.detailLabel}>Request Body:</Text>
                          <Text style={styles.codeText}>
                            {JSON.stringify(ep.request_body, null, 2).slice(0, 500)}
                          </Text>
                        </View>
                      ) : null}

                      {/* Try it out button */}
                      <TouchableOpacity
                        style={[styles.tryBtn, executeEndpoint === key && styles.tryBtnActive]}
                        onPress={() => setExecuteEndpoint(executeEndpoint === key ? null : key)}
                      >
                        <Text style={[styles.tryBtnText, executeEndpoint === key && styles.tryBtnTextActive]}>
                          {executeEndpoint === key ? "Close" : "Try it out"}
                        </Text>
                      </TouchableOpacity>

                      {/* Execute panel */}
                      {executeEndpoint === key && selectedEnv ? (
                        <ExecutePanel
                          endpoint={ep}
                          baseUrl={selectedEnv.base_url}
                          environmentId={selectedEnv.id}
                          swaggerType={swaggerType}
                        />
                      ) : null}
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 60 },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  serviceName: { fontSize: 22, fontWeight: "bold", color: colors.gray[900] },
  serviceDesc: { fontSize: 13, color: colors.gray[500], marginTop: 4 },
  deleteText: { color: colors.red[500], fontSize: 14, fontWeight: "600" },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.gray[800] },
  addText: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  addForm: { backgroundColor: colors.white, borderRadius: 10, padding: 14, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: colors.gray[300], borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 8, color: colors.gray[900] },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 4 },
  submitBtnText: { color: colors.white, fontWeight: "600", fontSize: 14 },
  envChips: { flexGrow: 0, marginBottom: 4 },
  envChip: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray[200], borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, minWidth: 80 },
  envChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  envChipText: { fontSize: 14, fontWeight: "500", color: colors.gray[700] },
  envChipTextActive: { color: colors.white },
  hint: { fontSize: 11, color: colors.gray[400], marginTop: 4 },
  toggle: { flexDirection: "row", backgroundColor: colors.gray[100], borderRadius: 8, padding: 3, marginTop: 8 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  toggleActive: { backgroundColor: colors.white, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  toggleText: { fontSize: 13, fontWeight: "500", color: colors.gray[500] },
  toggleTextActive: { color: colors.gray[900] },
  errorBox: { backgroundColor: colors.red[50], borderRadius: 8, padding: 12, marginTop: 8 },
  errorText: { color: colors.red[700], fontSize: 13 },
  emptyText: { color: colors.gray[400], fontSize: 13, marginTop: 12 },
  endpoint: { backgroundColor: colors.white, borderRadius: 10, padding: 12, marginTop: 8 },
  endpointRow: { flexDirection: "row", alignItems: "center" },
  methodBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginRight: 8, minWidth: 50, alignItems: "center" },
  methodText: { fontSize: 11, fontWeight: "700", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  pathText: { fontSize: 13, fontWeight: "500", color: colors.gray[900], flex: 1, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  summary: { fontSize: 12, color: colors.gray[500], marginTop: 4 },
  details: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.gray[100] },
  detailText: { fontSize: 12, color: colors.gray[600], marginBottom: 8 },
  detailLabel: { fontSize: 12, fontWeight: "600", color: colors.gray[700], marginBottom: 4 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  tag: { backgroundColor: colors.gray[100], borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, color: colors.gray[600] },
  paramText: { fontSize: 12, color: colors.gray[600], marginLeft: 8 },
  tryBtn: { marginTop: 10, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  tryBtnActive: { backgroundColor: colors.gray[200] },
  tryBtnText: { color: colors.white, fontSize: 13, fontWeight: "600" },
  tryBtnTextActive: { color: colors.gray[700] },
  codeText: { fontSize: 11, color: colors.gray[700], fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", backgroundColor: colors.gray[50], padding: 8, borderRadius: 6, marginTop: 4 },
});
