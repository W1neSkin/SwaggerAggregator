/**
 * ExecutePanel — "Try it out" panel for endpoint execution.
 * Renders parameter inputs, auth options, and displays the response.
 * Calls the backend proxy to forward the request to the target service.
 */

import { useState } from "react";
import { proxyApi } from "@swagger-aggregator/shared";
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

  // Pre-fill path params from swagger examples/defaults
  const getParamExample = (name: string): string => {
    const param = endpoint.parameters.find((p) => p.name === name);
    if (!param) return "";
    const schema = param.schema as Record<string, unknown> | undefined;
    const example = param.example ?? schema?.example ?? schema?.default ?? "";
    return example !== "" ? String(example) : "";
  };

  // Pre-fill query params from swagger spec
  const initQueryParams = (): Record<string, string> => {
    const params: Record<string, string> = {};
    for (const p of endpoint.parameters) {
      if (p.in === "query") {
        const schema = p.schema as Record<string, unknown> | undefined;
        const example = p.example ?? schema?.example ?? schema?.default ?? "";
        params[String(p.name)] = example !== "" && example != null ? String(example) : "";
      }
    }
    return params;
  };

  // State for inputs
  const [pathParams, setPathParams] = useState<Record<string, string>>(
    Object.fromEntries(pathParamNames.map((n) => [n, getParamExample(n)]))
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

  // Response
  const [response, setResponse] = useState<ProxyResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /** Build the full URL with path params replaced */
  const buildUrl = () => {
    let path = endpoint.path;
    for (const [name, value] of Object.entries(pathParams)) {
      path = path.replace(`{${name}}`, encodeURIComponent(value || name));
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
          <input
            type="text"
            value={jwtToken}
            onChange={(e) => setJwtToken(e.target.value)}
            placeholder="Paste JWT token from JWT Generator tab"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        )}
        {authMode === "admin" && (
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Admin password (uses stored one if empty)"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
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
