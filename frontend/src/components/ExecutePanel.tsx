/**
 * ExecutePanel — "Try it out" panel for endpoint execution.
 * Renders parameter inputs, auth options, and displays the response.
 * Calls the backend proxy to forward the request to the target service.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { proxyApi, secretsApi } from "@swagger-aggregator/shared";
import type { EndpointInfo, ProxyResponse } from "@swagger-aggregator/shared";

interface ExecutePanelProps {
  endpoint: EndpointInfo;
  baseUrl: string;            // e.g. "http://localhost:8000"
  environmentId: string;
  swaggerType: "main" | "admin";
}

export default function ExecutePanel({
  endpoint,
  baseUrl,
  environmentId,
  swaggerType,
}: ExecutePanelProps) {
  // Path parameters extracted from the path (e.g. /users/{id} -> ["id"])
  const pathParamNames = (endpoint.path.match(/\{(\w+)\}/g) || []).map((p) =>
    p.replace(/[{}]/g, "")
  );

  // Init query param fields from swagger spec (names only, no default values)
  const initQueryParams = (): Record<string, string> => {
    const params: Record<string, string> = {};
    for (const p of endpoint.parameters) {
      if (p.in === "query") {
        params[String(p.name)] = "";
      }
    }
    return params;
  };

  // State for inputs — all fields start empty, user fills them manually
  const [pathParams, setPathParams] = useState<Record<string, string>>(
    Object.fromEntries(pathParamNames.map((n) => [n, ""]))
  );
  const [queryParams, setQueryParams] = useState<Record<string, string>>(initQueryParams());
  const [bodyText, setBodyText] = useState(
    endpoint.request_body ? JSON.stringify(getRequestBodyExample(endpoint.request_body), null, 2) : ""
  );
  const [customHeaders, setCustomHeaders] = useState("");
  // Auth
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

  // Check stored secret status for this environment (always fetch — used for both JWT and Admin)
  const { data: secretStatus } = useQuery({
    queryKey: ["secretStatus", environmentId],
    queryFn: () => secretsApi.getSecretStatus(environmentId),
    enabled: !!environmentId,
  });

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
      setShowJwtGen(false); // collapse after success
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to generate";
      setJwtGenError(msg);
    } finally {
      setJwtGenLoading(false);
    }
  };

  // Response
  const [response, setResponse] = useState<ProxyResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /** Build the full URL with path params replaced */
  const buildUrl = () => {
    let path = endpoint.path;
    for (const [name, value] of Object.entries(pathParams)) {
      // Only substitute if the user actually entered a value; leave {name} placeholder otherwise
      if (value) {
        path = path.replace(`{${name}}`, encodeURIComponent(value));
      }
    }
    // Remove trailing slashes from baseUrl, leading slashes from path
    const base = baseUrl.replace(/\/+$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${cleanPath}`;
  };

  /** Execute the request */
  const handleExecute = async () => {
    setLoading(true);
    setError("");
    setResponse(null);

    try {
      // Parse custom headers
      let headers: Record<string, string> = {};
      if (customHeaders.trim()) {
        try {
          headers = JSON.parse(customHeaders);
        } catch {
          setError("Custom headers must be valid JSON (e.g. {\"X-Header\": \"value\"})");
          setLoading(false);
          return;
        }
      }

      // Parse body
      let body: unknown = undefined;
      if (bodyText.trim() && ["POST", "PUT", "PATCH"].includes(endpoint.method.toUpperCase())) {
        try {
          body = JSON.parse(bodyText);
        } catch {
          body = bodyText; // Send as raw string
        }
      }

      const result = await proxyApi.executeRequest({
        url: buildUrl(),
        method: endpoint.method.toUpperCase(),
        headers,
        query_params: Object.fromEntries(
          Object.entries(queryParams).filter(([, v]) => v !== "")
        ),
        body,
        environment_id: environmentId,
        auth_mode: authMode,
        jwt_token: authMode === "jwt" ? jwtToken : undefined,
        admin_password: authMode === "admin" ? adminPassword : undefined,
      });

      setResponse(result);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Request failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /** Get status color */
  const statusColor = (code: number) => {
    if (code >= 200 && code < 300) return "text-green-700 bg-green-50";
    if (code >= 400 && code < 500) return "text-yellow-700 bg-yellow-50";
    return "text-red-700 bg-red-50";
  };

  /** Try to pretty-print response body as JSON */
  const formatBody = (body: string) => {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  };

  return (
    <div className="mt-3 border border-blue-200 rounded-lg bg-blue-50/30 p-4 space-y-3">
      <h4 className="text-xs font-bold text-blue-700 uppercase">Execute Request</h4>

      {/* URL preview */}
      <div className="text-xs font-mono bg-white rounded px-3 py-2 border border-gray-200 text-gray-700 break-all">
        {endpoint.method.toUpperCase()} {buildUrl()}
      </div>

      {/* Path parameters */}
      {pathParamNames.length > 0 && (
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Path Parameters</label>
          <div className="grid grid-cols-2 gap-2">
            {pathParamNames.map((name) => (
              <div key={name}>
                <label className="text-xs text-gray-500">{name}</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={pathParams[name] || ""}
                  onChange={(e) => setPathParams({ ...pathParams, [name]: e.target.value })}
                  placeholder={name}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Query parameters */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-gray-600">Query Parameters</label>
          <button
            type="button"
            onClick={() =>
              setQueryParams({ ...queryParams, [`param${Object.keys(queryParams).length + 1}`]: "" })
            }
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            + Add
          </button>
        </div>
        {Object.entries(queryParams).map(([key, value], idx) => (
          <div key={idx} className="flex gap-2 mb-1">
            <input
              type="text"
              autoComplete="off"
              value={key}
              onChange={(e) => {
                const newParams = { ...queryParams };
                delete newParams[key];
                newParams[e.target.value] = value;
                setQueryParams(newParams);
              }}
              placeholder="key"
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <input
              type="text"
              autoComplete="off"
              value={value}
              onChange={(e) => setQueryParams({ ...queryParams, [key]: e.target.value })}
              placeholder="value"
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button
              type="button"
              onClick={() => {
                const newParams = { ...queryParams };
                delete newParams[key];
                setQueryParams(newParams);
              }}
              className="text-red-400 hover:text-red-600 text-xs px-1"
            >
              x
            </button>
          </div>
        ))}
      </div>

      {/* Request body (for POST/PUT/PATCH) */}
      {["POST", "PUT", "PATCH"].includes(endpoint.method.toUpperCase()) && (
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Request Body (JSON)</label>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={5}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400 resize-y"
            placeholder='{"key": "value"}'
          />
        </div>
      )}

      {/* Auth section */}
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Authentication</label>
        <div className="flex gap-1 bg-gray-100 rounded p-0.5 mb-2">
          {(["jwt", "admin", "none"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setAuthMode(mode)}
              className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                authMode === mode ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
              }`}
            >
              {mode === "jwt" ? "JWT Token" : mode === "admin" ? "Admin Password" : "No Auth"}
            </button>
          ))}
        </div>

        {authMode === "jwt" && (
          <div className="space-y-2">
            {/* Stored jwt_secret indicator (shown before opening the generator) */}
            {secretStatus?.has_jwt_secret && !showJwtGen && !jwtToken && (
              <div className="flex items-center gap-1.5 px-2 py-1.5 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-700">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span>Stored jwt_secret found — click Generate to create a token quickly</span>
              </div>
            )}
            {/* Token input + generate button */}
            <div className="flex gap-2">
              <input
                type="text"
                value={jwtToken}
                onChange={(e) => setJwtToken(e.target.value)}
                placeholder="JWT token (paste or generate below)"
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <button
                type="button"
                onClick={() => setShowJwtGen(!showJwtGen)}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all shrink-0 ${
                  showJwtGen
                    ? "bg-gray-200 text-gray-600"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {showJwtGen ? "Close" : "Generate"}
              </button>
            </div>

            {/* Inline JWT generator */}
            {showJwtGen && (
              <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Quick JWT Generator</p>

                {/* User ID */}
                <input
                  type="text"
                  value={jwtUserId}
                  onChange={(e) => setJwtUserId(e.target.value)}
                  placeholder='User ID (JWT "sub" claim)'
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                />

                {/* Secret mode toggle */}
                <div className="flex gap-1 bg-gray-100 rounded p-0.5">
                  {(["stored", "manual"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setJwtSecretMode(m)}
                      className={`flex-1 py-1 rounded text-[11px] font-medium transition-colors ${
                        jwtSecretMode === m ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                      }`}
                    >
                      {m === "stored" ? "Stored Secret" : "Enter Manually"}
                    </button>
                  ))}
                </div>

                {/* Stored status */}
                {jwtSecretMode === "stored" && (
                  <p className={`text-[11px] ${secretStatus?.has_jwt_secret ? "text-emerald-600" : "text-amber-600"}`}>
                    {secretStatus?.has_jwt_secret
                      ? "jwt_secret is saved for this environment"
                      : "No stored secret. Save in Settings or switch to manual."}
                  </p>
                )}

                {/* Manual secret input */}
                {jwtSecretMode === "manual" && (
                  <input
                    type="password"
                    value={jwtManualSecret}
                    onChange={(e) => setJwtManualSecret(e.target.value)}
                    placeholder="JWT secret (not stored)"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                )}

                {/* Error */}
                {jwtGenError && <p className="text-[11px] text-red-600">{jwtGenError}</p>}

                {/* Generate button */}
                <button
                  onClick={handleGenerateJwt}
                  disabled={jwtGenLoading}
                  className="w-full py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {jwtGenLoading ? "Generating..." : "Generate & Use"}
                </button>

                {jwtToken && (
                  <p className="text-[11px] text-emerald-600 font-medium">Token ready.</p>
                )}
              </div>
            )}
          </div>
        )}
        {authMode === "admin" && (
          <div className="space-y-1.5">
            {/* Stored password indicator */}
            {secretStatus?.has_admin_password && (
              <div className="flex items-center gap-1.5 px-2 py-1.5 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-700">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Stored admin password found — leave field empty to use it automatically</span>
              </div>
            )}
            {!secretStatus?.has_admin_password && secretStatus && (
              <p className="text-[11px] text-amber-600">
                No stored admin password. Enter manually or save one in Settings.
              </p>
            )}
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder={secretStatus?.has_admin_password ? "Leave empty to use stored password" : "Enter admin password"}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        )}
      </div>

      {/* Custom headers */}
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">
          Custom Headers (JSON, optional)
        </label>
        <input
          type="text"
          value={customHeaders}
          onChange={(e) => setCustomHeaders(e.target.value)}
          placeholder='{"X-Custom-Header": "value"}'
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>

      {/* Execute button */}
      <button
        onClick={handleExecute}
        disabled={loading}
        className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Executing..." : "Execute"}
      </button>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
          {/* Status bar */}
          <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-100">
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColor(response.status_code)}`}>
              {response.status_code}
            </span>
            <span className="text-xs text-gray-500">{response.elapsed_ms}ms</span>
          </div>
          {/* Debug: show actual URL that proxy called */}
          {response.request_url && (
            <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50">
              <span className="text-[10px] text-gray-400 font-mono break-all">{response.request_url}</span>
            </div>
          )}
          {/* Response body */}
          <pre className="p-3 text-xs font-mono overflow-auto max-h-80 text-gray-800 whitespace-pre-wrap">
            {formatBody(response.body)}
          </pre>
        </div>
      )}
    </div>
  );
}

/** Helper: extract example values from request_body schema */
function getRequestBodyExample(requestBody: Record<string, unknown>): unknown {
  try {
    // Try to find JSON schema in content -> application/json -> schema
    const content = requestBody?.content as Record<string, unknown> | undefined;
    if (content) {
      const jsonContent = content["application/json"] as Record<string, unknown> | undefined;
      if (jsonContent?.schema) {
        return buildExampleFromSchema(jsonContent.schema as Record<string, unknown>);
      }
    }
    return {};
  } catch {
    return {};
  }
}

/** Build a placeholder object from an OpenAPI schema */
function buildExampleFromSchema(schema: Record<string, unknown>): unknown {
  if (schema.example !== undefined) return schema.example;
  if (schema.type === "object" && schema.properties) {
    const props = schema.properties as Record<string, Record<string, unknown>>;
    const result: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(props)) {
      if (prop.example !== undefined) {
        result[key] = prop.example;
      } else if (prop.type === "string") {
        result[key] = "string";
      } else if (prop.type === "integer" || prop.type === "number") {
        result[key] = 0;
      } else if (prop.type === "boolean") {
        result[key] = false;
      } else if (prop.type === "array") {
        result[key] = [];
      } else {
        result[key] = null;
      }
    }
    return result;
  }
  if (schema.type === "array") return [];
  return {};
}
