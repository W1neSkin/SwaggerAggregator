/**
 * ExecutePanel — "Try it out" panel for mobile.
 * Allows executing API requests through the backend proxy.
 * Theme-aware.
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { proxyApi, secretsApi } from "@swagger-aggregator/shared";
import type { EndpointInfo, ProxyResponse } from "@swagger-aggregator/shared";
import { useTheme } from "../lib/ThemeContext";

interface Props {
  endpoint: EndpointInfo;
  baseUrl: string;
  environmentId: string;
  swaggerType: "main" | "admin";
}

export default function ExecutePanel({ endpoint, baseUrl, environmentId, swaggerType }: Props) {
  const { colors } = useTheme();

  // Extract path params from the path
  const pathParamNames = (endpoint.path.match(/\{(\w+)\}/g) || []).map((p) =>
    p.replace(/[{}]/g, "")
  );

  const [pathParams, setPathParams] = useState<Record<string, string>>(
    Object.fromEntries(pathParamNames.map((n) => [n, ""]))
  );
  const [bodyText, setBodyText] = useState("");
  const [authMode, setAuthMode] = useState<"jwt" | "admin" | "none">(
    swaggerType === "admin" ? "admin" : "jwt"
  );
  const [jwtToken, setJwtToken] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // Inline JWT generator state
  const [showJwtGen, setShowJwtGen] = useState(false);
  const [jwtUserId, setJwtUserId] = useState("");
  const [jwtSecretMode, setJwtSecretMode] = useState<"stored" | "manual">("stored");
  const [jwtManualSecret, setJwtManualSecret] = useState("");
  const [jwtGenLoading, setJwtGenLoading] = useState(false);
  const [jwtGenError, setJwtGenError] = useState("");

  // Stored secret status
  const [hasStoredJwtSecret, setHasStoredJwtSecret] = useState<boolean | null>(null);
  const [hasStoredAdminPw, setHasStoredAdminPw] = useState<boolean | null>(null);

  const checkStoredSecrets = async () => {
    try {
      const status = await secretsApi.getSecretStatus(environmentId);
      setHasStoredJwtSecret(status.has_jwt_secret);
      setHasStoredAdminPw(status.has_admin_password);
    } catch {
      setHasStoredJwtSecret(null);
      setHasStoredAdminPw(null);
    }
  };

  useEffect(() => {
    if (environmentId) checkStoredSecrets();
  }, [environmentId]);

  const handleGenerateJwt = async () => {
    if (!jwtUserId.trim()) { setJwtGenError("Enter a User ID"); return; }
    if (jwtSecretMode === "manual" && !jwtManualSecret.trim()) { setJwtGenError("Enter a JWT secret"); return; }
    setJwtGenLoading(true);
    setJwtGenError("");
    try {
      const result = await secretsApi.generateJwt({
        environment_id: environmentId,
        user_id_value: jwtUserId,
        ...(jwtSecretMode === "manual" ? { jwt_secret: jwtManualSecret } : {}),
      });
      setJwtToken(result.token);
      setShowJwtGen(false);
    } catch (err: any) {
      setJwtGenError(err?.response?.data?.detail || "Failed to generate");
    } finally {
      setJwtGenLoading(false);
    }
  };

  const [response, setResponse] = useState<ProxyResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const buildUrl = () => {
    let path = endpoint.path;
    for (const [name, value] of Object.entries(pathParams)) {
      if (value) path = path.replace(`{${name}}`, encodeURIComponent(value));
    }
    const base = baseUrl.replace(/\/+$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${cleanPath}`;
  };

  const handleExecute = async () => {
    setLoading(true);
    setError("");
    setResponse(null);
    try {
      let body: unknown = undefined;
      if (bodyText.trim() && ["POST", "PUT", "PATCH"].includes(endpoint.method.toUpperCase())) {
        try { body = JSON.parse(bodyText); } catch { body = bodyText; }
      }
      const result = await proxyApi.executeRequest({
        url: buildUrl(),
        method: endpoint.method.toUpperCase(),
        headers: {},
        body,
        environment_id: environmentId,
        auth_mode: authMode,
        jwt_token: authMode === "jwt" ? jwtToken : undefined,
        admin_password: authMode === "admin" ? adminPassword : undefined,
      });
      setResponse(result);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const formatBody = (body: string) => {
    try { return JSON.stringify(JSON.parse(body), null, 2); } catch { return body; }
  };

  const statusColor = (code: number) => {
    if (code >= 200 && code < 300) return colors.green700;
    if (code >= 400 && code < 500) return colors.warning;
    return colors.red700;
  };

  return (
    <View style={[styles.container, { borderColor: colors.border, backgroundColor: colors.blue50 }]}>
      <Text style={[styles.title, { color: colors.primary }]}>Execute Request</Text>

      {/* URL preview */}
      <Text style={[styles.urlPreview, { backgroundColor: colors.card, color: colors.text }]}>
        {endpoint.method.toUpperCase()} {buildUrl()}
      </Text>

      {/* Path params */}
      {pathParamNames.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Path Parameters</Text>
          {pathParamNames.map((name) => (
            <TextInput
              key={name}
              style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg, color: colors.text }]}
              placeholder={name}
              value={pathParams[name] || ""}
              onChangeText={(v) => setPathParams({ ...pathParams, [name]: v })}
              placeholderTextColor={colors.textMuted}
            />
          ))}
        </View>
      )}

      {/* Request body */}
      {["POST", "PUT", "PATCH"].includes(endpoint.method.toUpperCase()) && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Request Body (JSON)</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg, color: colors.text, height: 80, textAlignVertical: "top" }]}
            placeholder='{"key": "value"}'
            value={bodyText}
            onChangeText={setBodyText}
            multiline
            placeholderTextColor={colors.textMuted}
          />
        </View>
      )}

      {/* Auth */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Authentication</Text>
        <View style={[styles.toggle, { backgroundColor: colors.toggleBg }]}>
          {(["jwt", "admin", "none"] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.toggleBtn, authMode === mode && [styles.toggleActive, { backgroundColor: colors.toggleActive }]]}
              onPress={() => setAuthMode(mode)}
            >
              <Text style={[styles.toggleText, { color: colors.textMuted }, authMode === mode && { color: colors.text }]}>
                {mode === "jwt" ? "JWT" : mode === "admin" ? "Admin" : "None"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {authMode === "jwt" && (
          <View>
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, color: colors.text }]}
                placeholder="JWT token (paste or generate)"
                value={jwtToken}
                onChangeText={setJwtToken}
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity
                style={{ backgroundColor: showJwtGen ? colors.toggleBg : colors.green700, borderRadius: 6, paddingHorizontal: 12, justifyContent: "center" }}
                onPress={() => { setShowJwtGen(!showJwtGen); if (!showJwtGen) checkStoredSecrets(); }}
              >
                <Text style={{ color: showJwtGen ? colors.text : "#fff", fontSize: 12, fontWeight: "600" }}>
                  {showJwtGen ? "Close" : "Generate"}
                </Text>
              </TouchableOpacity>
            </View>

            {showJwtGen && (
              <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, marginBottom: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                  Quick JWT Generator
                </Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg, color: colors.text }]}
                  placeholder='User ID (JWT "sub" claim)'
                  value={jwtUserId}
                  onChangeText={setJwtUserId}
                  placeholderTextColor={colors.textMuted}
                />
                <View style={[styles.toggle, { backgroundColor: colors.toggleBg, marginBottom: 6 }]}>
                  {(["stored", "manual"] as const).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.toggleBtn, jwtSecretMode === m && [styles.toggleActive, { backgroundColor: colors.toggleActive }]]}
                      onPress={() => setJwtSecretMode(m)}
                    >
                      <Text style={[styles.toggleText, { color: colors.textMuted }, jwtSecretMode === m && { color: colors.text }]}>
                        {m === "stored" ? "Stored Secret" : "Manual"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {jwtSecretMode === "stored" && hasStoredJwtSecret !== null && (
                  <Text style={{ fontSize: 10, color: hasStoredJwtSecret ? colors.green700 : colors.warning, marginBottom: 4 }}>
                    {hasStoredJwtSecret ? "jwt_secret is saved for this environment" : "No stored secret. Switch to manual."}
                  </Text>
                )}
                {jwtSecretMode === "manual" && (
                  <TextInput
                    style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg, color: colors.text }]}
                    placeholder="JWT secret (not stored)"
                    value={jwtManualSecret}
                    onChangeText={setJwtManualSecret}
                    secureTextEntry
                    placeholderTextColor={colors.textMuted}
                  />
                )}
                {jwtGenError ? <Text style={{ fontSize: 10, color: colors.red700, marginBottom: 4 }}>{jwtGenError}</Text> : null}
                <TouchableOpacity
                  style={{ backgroundColor: colors.green700, borderRadius: 6, paddingVertical: 8, alignItems: "center", opacity: jwtGenLoading ? 0.5 : 1 }}
                  onPress={handleGenerateJwt}
                  disabled={jwtGenLoading}
                >
                  {jwtGenLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Generate & Use</Text>
                  )}
                </TouchableOpacity>
                {jwtToken ? <Text style={{ fontSize: 10, color: colors.green700, fontWeight: "500", marginTop: 4 }}>Token ready.</Text> : null}
              </View>
            )}
          </View>
        )}

        {authMode === "admin" && (
          <View>
            {hasStoredAdminPw === true && (
              <Text style={{ fontSize: 10, color: colors.green700, marginBottom: 4 }}>
                Stored admin password found — leave empty to use it
              </Text>
            )}
            {hasStoredAdminPw === false && (
              <Text style={{ fontSize: 10, color: colors.warning, marginBottom: 4 }}>
                No stored admin password. Enter manually or save in Settings.
              </Text>
            )}
            <TextInput
              style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg, color: colors.text }]}
              placeholder={hasStoredAdminPw ? "Leave empty to use stored" : "Enter admin password"}
              value={adminPassword}
              onChangeText={setAdminPassword}
              secureTextEntry
              placeholderTextColor={colors.textMuted}
            />
          </View>
        )}
      </View>

      {/* Execute button */}
      <TouchableOpacity
        style={[styles.execBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.5 }]}
        onPress={handleExecute}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.execBtnText}>Execute</Text>
        )}
      </TouchableOpacity>

      {/* Error */}
      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.red50 }]}>
          <Text style={[styles.errorText, { color: colors.red700 }]}>{error}</Text>
        </View>
      ) : null}

      {/* Response */}
      {response ? (
        <View style={[styles.responseBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statusRow, { borderBottomColor: colors.separator }]}>
            <Text style={[styles.statusCode, { color: statusColor(response.status_code) }]}>
              {response.status_code}
            </Text>
            <Text style={[styles.elapsed, { color: colors.textMuted }]}>{response.elapsed_ms}ms</Text>
          </View>
          {response.request_url ? (
            <Text style={{ fontSize: 9, color: colors.textMuted, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", paddingHorizontal: 10, paddingVertical: 4 }}>
              {response.request_url}
            </Text>
          ) : null}
          <ScrollView horizontal>
            <Text style={[styles.responseBody, { color: colors.text }]} selectable>
              {formatBody(response.body)}
            </Text>
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8, borderWidth: 1, borderRadius: 10, padding: 12 },
  title: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 8 },
  urlPreview: { fontSize: 11, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", borderRadius: 6, padding: 8, marginBottom: 8 },
  section: { marginBottom: 8 },
  label: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, marginBottom: 4 },
  toggle: { flexDirection: "row", borderRadius: 6, padding: 2, marginBottom: 6 },
  toggleBtn: { flex: 1, paddingVertical: 6, borderRadius: 4, alignItems: "center" },
  toggleActive: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  toggleText: { fontSize: 12, fontWeight: "500" },
  execBtn: { borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 4 },
  execBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  errorBox: { borderRadius: 6, padding: 8, marginTop: 8 },
  errorText: { fontSize: 12 },
  responseBox: { marginTop: 8, borderRadius: 8, borderWidth: 1, overflow: "hidden" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1 },
  statusCode: { fontSize: 13, fontWeight: "700" },
  elapsed: { fontSize: 11 },
  responseBody: { fontSize: 11, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", padding: 10 },
});
