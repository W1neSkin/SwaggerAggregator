/**
 * ExplorerPage — unified API explorer with tree sidebar and context-aware detail panel.
 * Right panel shows ServiceDetail, EnvironmentDetail, or EndpointDetail based on tree selection.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { servicesApi, swaggerApi, secretsApi } from "@swagger-aggregator/shared";
import type { Service, Environment, EndpointInfo, SwaggerType, SecretStatus } from "@swagger-aggregator/shared";
import ApiTreeSidebar, { selectionKey } from "../components/ApiTreeSidebar";
import type { TreeSelection } from "../components/ApiTreeSidebar";
import ExecutePanel from "../components/ExecutePanel";

/** Method badge colors */
const methodBadge: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-700",
  POST: "bg-blue-100 text-blue-700",
  PUT: "bg-amber-100 text-amber-700",
  DELETE: "bg-red-100 text-red-700",
  PATCH: "bg-purple-100 text-purple-700",
};

export default function ExplorerPage() {
  const [selection, setSelection] = useState<TreeSelection | null>(null);

  const selectedKey = selection ? selectionKey(selection) : null;

  const handleSelect = (sel: TreeSelection) => setSelection(sel);

  return (
    <div className="flex h-full">
      {/* Left: tree sidebar */}
      <ApiTreeSidebar onSelect={handleSelect} selectedKey={selectedKey} />

      {/* Right: context-aware detail panel */}
      <div className="flex-1 overflow-y-auto bg-[var(--background)]">
        {!selection ? (
          <EmptyState />
        ) : selection.type === "service" ? (
          <ServiceDetail service={selection.service} onSelect={handleSelect} />
        ) : selection.type === "environment" ? (
          <EnvironmentDetail env={selection.env} onSelect={handleSelect} />
        ) : (
          <EndpointDetail
            endpoint={selection.endpoint}
            environmentId={selection.environmentId}
            baseUrl={selection.baseUrl}
            swaggerType={selection.swaggerType}
          />
        )}
      </div>
    </div>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
      <div className="text-center">
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
        <p className="text-lg font-medium">Select an item</p>
        <p className="text-sm text-gray-300 dark:text-gray-600 mt-1">Click a service, environment, or endpoint in the sidebar</p>
      </div>
    </div>
  );
}

// ─── SERVICE DETAIL ───────────────────────────────────────────────────────────

function ServiceDetail({ service, onSelect }: { service: Service; onSelect: (sel: TreeSelection) => void }) {
  // Fetch environments for this service
  const { data: environments } = useQuery({
    queryKey: ["environments", service.id],
    queryFn: () => servicesApi.listEnvironments(service.id),
  });

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{service.name}</h1>
            {service.description && <p className="text-sm text-gray-500 dark:text-gray-400">{service.description}</p>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{environments?.length ?? "..."}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Environments</p>
        </div>
      </div>

      {/* Environments list */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Environments</h3>
        {environments && environments.length > 0 ? (
          <div className="space-y-2">
            {environments.map((env: Environment) => (
              <EnvironmentCard key={env.id} env={env} serviceId={service.id} onSelect={onSelect} />
            ))}
          </div>
        ) : environments && environments.length === 0 ? (
          <p className="text-sm text-gray-400">No environments yet. Add one from the sidebar.</p>
        ) : null}
      </div>
    </div>
  );
}

/** Small card for an environment inside ServiceDetail */
function EnvironmentCard({ env, serviceId, onSelect }: { env: Environment; serviceId: string; onSelect: (sel: TreeSelection) => void }) {
  // Fetch secret status for this environment
  const { data: secretStatus } = useQuery({
    queryKey: ["secretStatus", env.id],
    queryFn: () => secretsApi.getSecretStatus(env.id),
  });

  return (
    <button
      onClick={() => onSelect({ type: "environment", env, serviceId })}
      className="w-full text-left bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{env.name}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{env.base_url}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Secret status dots */}
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <div className={`w-2 h-2 rounded-full ${secretStatus?.has_jwt_secret ? "bg-emerald-500" : "bg-gray-200"}`} />
            <span>JWT</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <div className={`w-2 h-2 rounded-full ${secretStatus?.has_admin_password ? "bg-emerald-500" : "bg-gray-200"}`} />
            <span>Admin</span>
          </div>
          <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// ─── ENVIRONMENT DETAIL ───────────────────────────────────────────────────────

function EnvironmentDetail({ env, onSelect }: { env: Environment; onSelect: (sel: TreeSelection) => void }) {
  const queryClient = useQueryClient();

  // Secrets management state
  const [jwtSecret, setJwtSecret] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [saveErr, setSaveErr] = useState("");

  // Fetch secret status
  const { data: secretStatus } = useQuery({
    queryKey: ["secretStatus", env.id],
    queryFn: () => secretsApi.getSecretStatus(env.id),
  });

  // Fetch endpoints for overview (both API and Admin API)
  const { data: mainEndpoints } = useQuery({
    queryKey: ["endpoints", env.id, "main"],
    queryFn: () => swaggerApi.getEndpoints(env.id, "main"),
  });
  const { data: adminEndpoints } = useQuery({
    queryKey: ["endpoints", env.id, "admin"],
    queryFn: () => swaggerApi.getEndpoints(env.id, "admin"),
  });

  const handleSave = async () => {
    setSaveErr(""); setSaveMsg("");
    const data: { jwt_secret?: string; admin_password?: string } = {};
    if (jwtSecret.trim()) data.jwt_secret = jwtSecret;
    if (adminPassword.trim()) data.admin_password = adminPassword;
    if (Object.keys(data).length === 0) { setSaveErr("Enter at least one secret"); return; }
    try {
      await secretsApi.saveSecrets(env.id, data);
      setSaveMsg("Secrets saved!");
      setJwtSecret(""); setAdminPassword("");
      queryClient.invalidateQueries({ queryKey: ["secretStatus", env.id] });
    } catch (err: unknown) {
      setSaveErr((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to save");
    }
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Environment</p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{env.name}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-0.5">{env.base_url}</p>
      </div>

      {/* Secrets management */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Secrets</h3>
          <p className="text-xs text-gray-400 mt-0.5">Store jwt_secret and admin_password for this environment</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Current status */}
          {secretStatus && <SecretStatusBadges status={secretStatus} />}

          {/* JWT Secret input */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">JWT Secret</label>
            <input
              type="password" value={jwtSecret} onChange={(e) => setJwtSecret(e.target.value)}
              placeholder="Enter new jwt_secret (leave empty to keep current)"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Admin Password input */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Admin Password</label>
            <input
              type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Enter new admin_password (leave empty to keep current)"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Messages */}
          {saveErr && <p className="text-xs text-red-600">{saveErr}</p>}
          {saveMsg && <p className="text-xs text-emerald-600">{saveMsg}</p>}

          {/* Save button */}
          <button onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
            Save Secrets
          </button>
        </div>
      </div>

      {/* Endpoint overview — API */}
      <EndpointOverviewSection
        label="API"
        endpoints={mainEndpoints}
        envId={env.id}
        baseUrl={env.base_url}
        swaggerType="main"
        onSelect={onSelect}
      />

      {/* Endpoint overview — Admin API */}
      <EndpointOverviewSection
        label="Admin API"
        endpoints={adminEndpoints}
        envId={env.id}
        baseUrl={env.base_url}
        swaggerType="admin"
        onSelect={onSelect}
      />
    </div>
  );
}

/** Displays green/gray dots for jwt_secret and admin_password */
function SecretStatusBadges({ status }: { status: SecretStatus }) {
  return (
    <div className="flex gap-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
      <div className="flex items-center gap-1.5 text-sm">
        <div className={`w-2.5 h-2.5 rounded-full ${status.has_jwt_secret ? "bg-emerald-500" : "bg-gray-300"}`} />
        <span className={status.has_jwt_secret ? "text-gray-700" : "text-gray-400"}>jwt_secret</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm">
        <div className={`w-2.5 h-2.5 rounded-full ${status.has_admin_password ? "bg-emerald-500" : "bg-gray-300"}`} />
        <span className={status.has_admin_password ? "text-gray-700" : "text-gray-400"}>admin_password</span>
      </div>
    </div>
  );
}

/** Compact endpoint list section used in EnvironmentDetail */
function EndpointOverviewSection({
  label, endpoints, envId, baseUrl, swaggerType, onSelect,
}: {
  label: string;
  endpoints: EndpointInfo[] | undefined;
  envId: string;
  baseUrl: string;
  swaggerType: SwaggerType;
  onSelect: (sel: TreeSelection) => void;
}) {
  if (!endpoints) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        {label} <span className="text-gray-300">({endpoints.length} endpoints)</span>
      </h3>
      {endpoints.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700">
          {endpoints.map((ep: EndpointInfo, idx: number) => {
            const mc = methodBadge[ep.method] || "bg-gray-100 text-gray-600";
            return (
              <button
                key={idx}
                onClick={() => onSelect({ type: "endpoint", endpoint: ep, environmentId: envId, baseUrl, swaggerType })}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold w-12 justify-center shrink-0 ${mc}`}>
                  {ep.method}
                </span>
                <span className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate">{ep.path}</span>
                {ep.summary && (
                  <span className="text-[11px] text-gray-400 truncate ml-auto">{ep.summary}</span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-gray-400">No endpoints found</p>
      )}
    </div>
  );
}

// ─── ENDPOINT DETAIL ──────────────────────────────────────────────────────────

function EndpointDetail({
  endpoint, environmentId, baseUrl, swaggerType,
}: {
  endpoint: EndpointInfo; environmentId: string; baseUrl: string; swaggerType: SwaggerType;
}) {
  const [executeOpen, setExecuteOpen] = useState(false);
  const ms = methodBadge[endpoint.method] || "bg-gray-100 text-gray-600";

  const formatJson = (obj: unknown) => {
    try { return JSON.stringify(obj, null, 2); }
    catch { return String(obj); }
  };

  return (
    <div className="p-6 max-w-4xl space-y-5">
      {/* Endpoint title */}
      <div className="flex items-start gap-3">
        <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-bold ring-1 shrink-0 ${ms}`}>
          {endpoint.method}
        </span>
        <div className="min-w-0">
          <p className="font-mono text-base text-gray-900 dark:text-gray-100 font-medium break-all">{endpoint.path}</p>
          {endpoint.summary && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{endpoint.summary}</p>}
          {endpoint.tags.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {endpoint.tags.map((tag: string) => (
                <span key={tag} className="text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {endpoint.description && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">{endpoint.description}</p>
        </div>
      )}

      {/* Parameters table */}
      {endpoint.parameters.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Parameters</h4>
          <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden text-xs border border-gray-100 dark:border-gray-700">
            <div className="grid grid-cols-6 gap-2 p-2.5 font-semibold text-gray-500 border-b border-gray-200 dark:border-gray-700">
              <span>Name</span><span>In</span><span>Type</span><span>Required</span><span>Description</span><span>Example</span>
            </div>
            {endpoint.parameters.map((param: Record<string, unknown>, pIdx: number) => {
              const schema = param.schema as Record<string, unknown> | undefined;
              const example = param.example ?? schema?.example ?? schema?.default ?? "";
              const description = param.description ?? "";
              return (
                <div key={pIdx} className="grid grid-cols-6 gap-2 p-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <span className="font-mono text-gray-800 dark:text-gray-200 font-medium">{String(param.name || "")}</span>
                  <span className="text-gray-500">{String(param.in || "")}</span>
                  <span className="text-gray-500">{String(schema?.type || param.type || "")}</span>
                  <span>{param.required ? <span className="text-amber-600 font-semibold">Yes</span> : "No"}</span>
                  <span className="text-gray-500 truncate" title={String(description)}>{String(description)}</span>
                  <span className="font-mono text-blue-600 truncate" title={String(example)}>{example !== "" ? String(example) : "—"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Request body */}
      {endpoint.request_body && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Request Body</h4>
          <pre className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 text-xs overflow-auto max-h-48 font-mono text-gray-700 dark:text-gray-300">
            {formatJson(endpoint.request_body)}
          </pre>
        </div>
      )}

      {/* Responses */}
      {Object.keys(endpoint.responses).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Responses</h4>
          <div className="space-y-1">
            {Object.entries(endpoint.responses).map(([code, detail]) => (
              <div key={code} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-gray-700 p-2 text-xs flex items-baseline gap-2">
                <span className={`font-bold ${code.startsWith("2") ? "text-emerald-600" : code.startsWith("4") ? "text-amber-600" : "text-gray-600"}`}>{code}</span>
                <span className="text-gray-500">
                  {(detail as Record<string, unknown>)?.description
                    ? String((detail as Record<string, unknown>).description)
                    : "No description"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Try it out */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <button
          onClick={() => setExecuteOpen(!executeOpen)}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            executeOpen
              ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              : "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {executeOpen ? "Close" : "Try it out"}
        </button>
        {executeOpen && (
          <ExecutePanel key={`${environmentId}:${endpoint.method}:${endpoint.path}`} endpoint={endpoint} baseUrl={baseUrl} environmentId={environmentId} swaggerType={swaggerType} />
        )}
      </div>
    </div>
  );
}
