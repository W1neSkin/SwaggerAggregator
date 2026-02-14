/**
 * ExecutePanel — "Try it out" panel for mobile.
 * Allows executing API requests through the backend proxy.
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
import { colors } from "../lib/colors";

interface Props {
  endpoint: EndpointInfo;
  baseUrl: string;
  environmentId: string;
  swaggerType: "main" | "admin";
}

export default function ExecutePanel({ endpoint, baseUrl, environmentId, swaggerType }: Props) {
  // Extract path params from the path (e.g. /users/{id} -> ["id"])
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
  // Stored secret status for this environment (jwt_secret + admin_password)
  const [hasStoredJwtSecret, setHasStoredJwtSecret] = useState<boolean | null>(null);
  const [hasStoredAdminPw, setHasStoredAdminPw] = useState<boolean | null>(null);

  /** Fetch stored secret status for this environment */
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

  // Fetch stored secret status on mount so indicators are available immediately
  useEffect(() => {
    if (environmentId) checkStoredSecrets();
  }, [environmentId]);

  /** Generate JWT and auto-fill the token field */
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

  /** Build the full URL with path params replaced */
  const buildUrl = () => {
    let path = endpoint.path;
    for (const [name, value] of Object.entries(pathParams)) {
      path = path.replace(`{${name}}`, encodeURIComponent(value || name));
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
    if (code >= 200 && code < 300) return colors.green[700];
    if (code >= 400 && code < 500) return colors.amber[600];
    return colors.red[700];
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Execute Request</Text>

      {/* URL preview */}
      <Text style={styles.urlPreview}>
        {endpoint.method.toUpperCase()} {buildUrl()}
      </Text>

      {/* Path params */}
      {pathParamNames.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Path Parameters</Text>
          {pathParamNames.map((name) => (
            <TextInput
              key={name}
              style={styles.input}
              placeholder={name}
              value={pathParams[name] || ""}
              onChangeText={(v) => setPathParams({ ...pathParams, [name]: v })}
              placeholderTextColor={colors.gray[400]}
            />
          ))}
        </View>
      )}

      {/* Request body */}
      {["POST", "PUT", "PATCH"].includes(endpoint.method.toUpperCase()) && (
        <View style={styles.section}>
          <Text style={styles.label}>Request Body (JSON)</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: "top" }]}
            placeholder='{"key": "value"}'
            value={bodyText}
            onChangeText={setBodyText}
            multiline
            placeholderTextColor={colors.gray[400]}
          />
        </View>
      )}

      {/* Auth */}
      <View style={styles.section}>
        <Text style={styles.label}>Authentication</Text>
        <View style={styles.toggle}>
          {(["jwt", "admin", "none"] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.toggleBtn, authMode === mode && styles.toggleActive]}
              onPress={() => setAuthMode(mode)}
            >
              <Text style={[styles.toggleText, authMode === mode && styles.toggleTextActive]}>
                {mode === "jwt" ? "JWT" : mode === "admin" ? "Admin" : "None"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {authMode === "jwt" && (
          <View>
            {/* Token input row + Generate button */}
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="JWT token (paste or generate)"
                value={jwtToken}
                onChangeText={setJwtToken}
                placeholderTextColor={colors.gray[400]}
              />
              <TouchableOpacity
                style={{
                  backgroundColor: showJwtGen ? colors.gray[200] : colors.green[700],
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  justifyContent: "center",
                }}
                onPress={() => {
                  setShowJwtGen(!showJwtGen);
                  if (!showJwtGen) checkStoredSecrets();
                }}
              >
                <Text style={{ color: showJwtGen ? colors.gray[600] : colors.white, fontSize: 12, fontWeight: "600" }}>
                  {showJwtGen ? "Close" : "Generate"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Inline JWT generator */}
            {showJwtGen && (
              <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray[200], borderRadius: 8, padding: 10, marginBottom: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: colors.gray[500], textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                  Quick JWT Generator
                </Text>

                {/* User ID input */}
                <TextInput
                  style={styles.input}
                  placeholder='User ID (JWT "sub" claim)'
                  value={jwtUserId}
                  onChangeText={setJwtUserId}
                  placeholderTextColor={colors.gray[400]}
                />

                {/* Secret mode toggle */}
                <View style={[styles.toggle, { marginBottom: 6 }]}>
                  {(["stored", "manual"] as const).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.toggleBtn, jwtSecretMode === m && styles.toggleActive]}
                      onPress={() => setJwtSecretMode(m)}
                    >
                      <Text style={[styles.toggleText, jwtSecretMode === m && styles.toggleTextActive]}>
                        {m === "stored" ? "Stored Secret" : "Manual"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Stored secret status hint */}
                {jwtSecretMode === "stored" && hasStoredJwtSecret !== null && (
                  <Text style={{ fontSize: 10, color: hasStoredJwtSecret ? colors.green[700] : colors.amber[600], marginBottom: 4 }}>
                    {hasStoredJwtSecret
                      ? "jwt_secret is saved for this environment"
                      : "No stored secret. Save in Settings or switch to manual."}
                  </Text>
                )}

                {/* Manual secret input */}
                {jwtSecretMode === "manual" && (
                  <TextInput
                    style={styles.input}
                    placeholder="JWT secret (not stored)"
                    value={jwtManualSecret}
                    onChangeText={setJwtManualSecret}
                    secureTextEntry
                    placeholderTextColor={colors.gray[400]}
                  />
                )}

                {/* Error */}
                {jwtGenError ? <Text style={{ fontSize: 10, color: colors.red[700], marginBottom: 4 }}>{jwtGenError}</Text> : null}

                {/* Generate button */}
                <TouchableOpacity
                  style={{ backgroundColor: colors.green[700], borderRadius: 6, paddingVertical: 8, alignItems: "center", opacity: jwtGenLoading ? 0.5 : 1 }}
                  onPress={handleGenerateJwt}
                  disabled={jwtGenLoading}
                >
                  {jwtGenLoading ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={{ color: colors.white, fontSize: 12, fontWeight: "600" }}>Generate & Use</Text>
                  )}
                </TouchableOpacity>

                {jwtToken ? <Text style={{ fontSize: 10, color: colors.green[700], fontWeight: "500", marginTop: 4 }}>Token ready.</Text> : null}
              </View>
            )}
          </View>
        )}
        {authMode === "admin" && (
          <View>
            {/* Stored admin password indicator */}
            {hasStoredAdminPw === true && (
              <Text style={{ fontSize: 10, color: colors.green[700], marginBottom: 4 }}>
                Stored admin password found — leave empty to use it automatically
              </Text>
            )}
            {hasStoredAdminPw === false && (
              <Text style={{ fontSize: 10, color: colors.amber[600], marginBottom: 4 }}>
                No stored admin password. Enter manually or save in Settings.
              </Text>
            )}
            <TextInput
              style={styles.input}
              placeholder={hasStoredAdminPw ? "Leave empty to use stored password" : "Enter admin password"}
              value={adminPassword}
              onChangeText={setAdminPassword}
              secureTextEntry
              placeholderTextColor={colors.gray[400]}
            />
          </View>
        )}
      </View>

      {/* Execute button */}
      <TouchableOpacity
        style={[styles.execBtn, loading && { opacity: 0.5 }]}
        onPress={handleExecute}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Text style={styles.execBtnText}>Execute</Text>
        )}
      </TouchableOpacity>

      {/* Error */}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Response */}
      {response ? (
        <View style={styles.responseBox}>
          <View style={styles.statusRow}>
            <Text style={[styles.statusCode, { color: statusColor(response.status_code) }]}>
              {response.status_code}
            </Text>
            <Text style={styles.elapsed}>{response.elapsed_ms}ms</Text>
          </View>
          <ScrollView horizontal>
            <Text style={styles.responseBody} selectable>
              {formatBody(response.body)}
            </Text>
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8, borderWidth: 1, borderColor: colors.blue[100], borderRadius: 10, backgroundColor: colors.blue[50], padding: 12 },
  title: { fontSize: 12, fontWeight: "700", color: colors.primary, textTransform: "uppercase", marginBottom: 8 },
  urlPreview: { fontSize: 11, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", backgroundColor: colors.white, borderRadius: 6, padding: 8, color: colors.gray[700], marginBottom: 8 },
  section: { marginBottom: 8 },
  label: { fontSize: 11, fontWeight: "600", color: colors.gray[600], marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.gray[300], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, backgroundColor: colors.white, color: colors.gray[900], marginBottom: 4 },
  toggle: { flexDirection: "row", backgroundColor: colors.gray[100], borderRadius: 6, padding: 2, marginBottom: 6 },
  toggleBtn: { flex: 1, paddingVertical: 6, borderRadius: 4, alignItems: "center" },
  toggleActive: { backgroundColor: colors.white, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  toggleText: { fontSize: 12, fontWeight: "500", color: colors.gray[500] },
  toggleTextActive: { color: colors.gray[900] },
  execBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 4 },
  execBtnText: { color: colors.white, fontSize: 14, fontWeight: "600" },
  errorBox: { backgroundColor: colors.red[50], borderRadius: 6, padding: 8, marginTop: 8 },
  errorText: { fontSize: 12, color: colors.red[700] },
  responseBox: { marginTop: 8, backgroundColor: colors.white, borderRadius: 8, borderWidth: 1, borderColor: colors.gray[200], overflow: "hidden" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  statusCode: { fontSize: 13, fontWeight: "700" },
  elapsed: { fontSize: 11, color: colors.gray[500] },
  responseBody: { fontSize: 11, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", color: colors.gray[800], padding: 10 },
});
