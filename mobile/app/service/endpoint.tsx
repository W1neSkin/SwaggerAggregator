/**
 * Endpoint Detail screen — shows full endpoint info + "Try it out".
 * Navigated to from the service detail endpoint list.
 * Theme-aware.
 */

import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import type { EndpointInfo, SwaggerType } from "@swagger-aggregator/shared";
import { useTheme } from "../../lib/ThemeContext";
import { methodColors } from "../../lib/colors";
import ExecutePanel from "../../components/ExecutePanel";

export default function EndpointDetailScreen() {
  const params = useLocalSearchParams<{
    endpointData: string;
    baseUrl: string;
    environmentId: string;
    swaggerType: string;
  }>();

  const { colors } = useTheme();
  const [showExecute, setShowExecute] = useState(false);

  // Parse endpoint data from route params
  let endpoint: EndpointInfo | null = null;
  try {
    endpoint = JSON.parse(params.endpointData || "null");
  } catch {
    endpoint = null;
  }

  if (!endpoint) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "Endpoint" }} />
        <Text style={[styles.errorMsg, { color: colors.textSecondary }]}>Failed to load endpoint data</Text>
      </View>
    );
  }

  const mc = methodColors[endpoint.method.toUpperCase()] || { bg: colors.gray100, text: colors.text };

  const formatJson = (obj: unknown) => {
    try { return JSON.stringify(obj, null, 2); }
    catch { return String(obj); }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Stack.Screen options={{ title: `${endpoint.method.toUpperCase()} ${endpoint.path}` }} />

      {/* Endpoint header */}
      <View style={styles.header}>
        <View style={[styles.methodBadge, { backgroundColor: mc.bg }]}>
          <Text style={[styles.methodText, { color: mc.text }]}>{endpoint.method.toUpperCase()}</Text>
        </View>
        <Text style={[styles.pathText, { color: colors.text }]}>{endpoint.path}</Text>
      </View>

      {/* Summary */}
      {endpoint.summary ? (
        <Text style={[styles.summary, { color: colors.textSecondary }]}>{endpoint.summary}</Text>
      ) : null}

      {/* Tags */}
      {endpoint.tags.length > 0 ? (
        <View style={styles.tagRow}>
          {endpoint.tags.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: colors.gray100 }]}>
              <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Description */}
      {endpoint.description ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>DESCRIPTION</Text>
          <Text style={[styles.descText, { color: colors.text }]}>{endpoint.description}</Text>
        </View>
      ) : null}

      {/* Parameters */}
      {endpoint.parameters.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PARAMETERS</Text>
          <View style={[styles.paramCard, { backgroundColor: colors.card }]}>
            {endpoint.parameters.map((p: any, i: number) => {
              const schema = p.schema || {};
              return (
                <View
                  key={i}
                  style={[
                    styles.paramRow,
                    i < endpoint!.parameters.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.separator },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.paramName, { color: colors.text }]}>{p.name}</Text>
                    <Text style={[styles.paramIn, { color: colors.textMuted }]}>{p.in}</Text>
                    {p.required ? <Text style={[styles.paramRequired, { color: colors.warning }]}>required</Text> : null}
                  </View>
                  <Text style={[styles.paramType, { color: colors.textMuted }]}>{schema.type || p.type || ""}</Text>
                  {p.description ? <Text style={[styles.paramDesc, { color: colors.textSecondary }]}>{p.description}</Text> : null}
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Request body */}
      {endpoint.request_body ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>REQUEST BODY</Text>
          <View style={[styles.codeBlock, { backgroundColor: colors.card }]}>
            <Text style={[styles.codeText, { color: colors.text }]}>
              {formatJson(endpoint.request_body).slice(0, 1000)}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Responses */}
      {Object.keys(endpoint.responses).length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>RESPONSES</Text>
          {Object.entries(endpoint.responses).map(([code, detail]) => (
            <View key={code} style={[styles.responseRow, { backgroundColor: colors.card }]}>
              <Text style={[styles.responseCode, {
                color: code.startsWith("2") ? colors.success : code.startsWith("4") ? colors.warning : colors.textSecondary
              }]}>{code}</Text>
              <Text style={[styles.responseDesc, { color: colors.textSecondary }]}>
                {(detail as any)?.description || "No description"}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Try it out */}
      <TouchableOpacity
        style={[
          styles.tryBtn,
          { backgroundColor: showExecute ? colors.toggleBg : colors.primary },
        ]}
        onPress={() => setShowExecute(!showExecute)}
      >
        <Text style={[styles.tryBtnText, { color: showExecute ? colors.text : "#fff" }]}>
          {showExecute ? "Close" : "Try it out"}
        </Text>
      </TouchableOpacity>

      {showExecute && params.baseUrl && params.environmentId ? (
        <ExecutePanel
          endpoint={endpoint}
          baseUrl={params.baseUrl}
          environmentId={params.environmentId}
          swaggerType={(params.swaggerType || "main") as SwaggerType}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 60 },
  errorMsg: { padding: 16, textAlign: "center", fontSize: 14 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  methodBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginRight: 10 },
  methodText: { fontSize: 13, fontWeight: "700", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  pathText: { fontSize: 15, fontWeight: "600", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", flex: 1 },
  summary: { fontSize: 14, marginBottom: 8 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  tag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11 },
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6 },
  descText: { fontSize: 14, lineHeight: 20 },
  paramCard: { borderRadius: 10, overflow: "hidden" },
  paramRow: { padding: 12 },
  paramName: { fontSize: 13, fontWeight: "600", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  paramIn: { fontSize: 11 },
  paramRequired: { fontSize: 10, fontWeight: "600" },
  paramType: { fontSize: 12, marginTop: 2 },
  paramDesc: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  codeBlock: { borderRadius: 10, padding: 12 },
  codeText: { fontSize: 11, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  responseRow: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 8, padding: 10, marginBottom: 4 },
  responseCode: { fontSize: 13, fontWeight: "700" },
  responseDesc: { fontSize: 12, flex: 1 },
  tryBtn: { borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  tryBtnText: { fontSize: 15, fontWeight: "600" },
});
