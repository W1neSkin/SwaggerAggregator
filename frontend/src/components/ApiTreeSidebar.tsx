/**
 * ApiTreeSidebar — collapsible tree for browsing Services > Environments > API/Admin API > Endpoints.
 * Each level lazily fetches data when expanded. CRUD actions (add/delete) are inline.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { servicesApi, swaggerApi } from "@swagger-aggregator/shared";
import type { Service, Environment, EndpointInfo, SwaggerType } from "@swagger-aggregator/shared";
import ConfirmDialog from "./ConfirmDialog";

/** Method badge colors for endpoint leaves */
const methodColor: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-700",
  POST: "bg-blue-100 text-blue-700",
  PUT: "bg-amber-100 text-amber-700",
  DELETE: "bg-red-100 text-red-700",
  PATCH: "bg-purple-100 text-purple-700",
};

/** Unique key for an endpoint leaf */
export function makeEndpointKey(envId: string, type: SwaggerType, ep: EndpointInfo, idx: number) {
  return `${envId}:${type}:${ep.operation_id || `${ep.method}:${ep.path}:${idx}`}`;
}

/**
 * Build the base URL for admin endpoints.
 * Admin swagger path (e.g. "/admin/openapi.json") tells us the mount prefix ("/admin").
 * We strip the filename to get the prefix and append it to base_url.
 */
function adminBaseUrl(env: Environment): string {
  const adminPath = env.admin_swagger_path || "/admin/openapi.json";
  // Remove the last segment (the spec filename) to get the mount prefix
  const prefix = adminPath.replace(/\/[^/]+$/, ""); // "/admin/openapi.json" → "/admin"
  const base = env.base_url.replace(/\/+$/, "");
  return prefix ? `${base}${prefix}` : base;
}

/** Union type for all possible selections from the tree */
export type TreeSelection =
  | { type: "service"; service: Service }
  | { type: "environment"; env: Environment; serviceId: string }
  | { type: "endpoint"; endpoint: EndpointInfo; environmentId: string; baseUrl: string; swaggerType: SwaggerType };

/** Compute a highlight key for any selection */
export function selectionKey(sel: TreeSelection): string {
  if (sel.type === "service") return `svc:${sel.service.id}`;
  if (sel.type === "environment") return `env:${sel.env.id}`;
  return makeEndpointKey(sel.environmentId, sel.swaggerType, sel.endpoint, 0);
}

interface ApiTreeSidebarProps {
  onSelect: (selection: TreeSelection) => void;
  selectedKey: string | null;
}

// ─── MAIN SIDEBAR COMPONENT ───────────────────────────────────────────────────

export default function ApiTreeSidebar({ onSelect, selectedKey }: ApiTreeSidebarProps) {
  const queryClient = useQueryClient();

  // Expand state for each tree level
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState("");

  // Add service inline form
  const [showAddService, setShowAddService] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDesc, setNewServiceDesc] = useState("");

  // Confirm dialog for deletes
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // Fetch all services
  const { data: services, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.listServices(),
  });

  // Create service mutation
  const createService = useMutation({
    mutationFn: (data: { name: string; description: string }) => servicesApi.createService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setShowAddService(false);
      setNewServiceName("");
      setNewServiceDesc("");
    },
  });

  // Delete service mutation
  const deleteService = useMutation({
    mutationFn: (id: string) => servicesApi.deleteService(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });

  const toggleService = (id: string) => {
    setExpandedServices((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="w-72 shrink-0 flex flex-col bg-white border-r border-gray-100 h-full">
      {/* Search */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search endpoints..."
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Scrollable tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-6 skeleton rounded" />)}
          </div>
        ) : services && services.length > 0 ? (
          services.map((svc: Service) => (
            <ServiceNode
              key={svc.id}
              service={svc}
              isExpanded={expandedServices.has(svc.id)}
              onToggle={() => toggleService(svc.id)}
              onSelectService={() => onSelect({ type: "service", service: svc })}
              onSelect={onSelect}
              selectedKey={selectedKey}
              searchFilter={searchFilter}
              onDelete={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Delete Service",
                  message: `Delete "${svc.name}" and all its environments?`,
                  onConfirm: () => { deleteService.mutate(svc.id); setConfirmDialog((d) => ({ ...d, isOpen: false })); },
                })
              }
              confirmDialog={confirmDialog}
              setConfirmDialog={setConfirmDialog}
            />
          ))
        ) : (
          <p className="p-4 text-xs text-gray-400 text-center">No services yet</p>
        )}
      </div>

      {/* Add service section */}
      <div className="border-t border-gray-100 p-2">
        {showAddService ? (
          <form
            onSubmit={(e) => { e.preventDefault(); createService.mutate({ name: newServiceName, description: newServiceDesc }); }}
            className="space-y-1.5"
          >
            <input
              type="text" value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)}
              placeholder="Service name" required autoFocus
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text" value={newServiceDesc} onChange={(e) => setNewServiceDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex gap-1">
              <button type="submit" disabled={createService.isPending}
                className="flex-1 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                {createService.isPending ? "..." : "Add"}
              </button>
              <button type="button" onClick={() => setShowAddService(false)}
                className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowAddService(true)}
            className="w-full py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded font-medium transition-colors">
            + Add Service
          </button>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((d) => ({ ...d, isOpen: false }))}
        confirmText="Delete"
        isDestructive
      />
    </div>
  );
}

// ─── SERVICE NODE ─────────────────────────────────────────────────────────────

interface ServiceNodeProps {
  service: Service;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectService: () => void;
  onSelect: (sel: TreeSelection) => void;
  selectedKey: string | null;
  searchFilter: string;
  onDelete: () => void;
  confirmDialog: { isOpen: boolean; title: string; message: string; onConfirm: () => void };
  setConfirmDialog: React.Dispatch<React.SetStateAction<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>>;
}

function ServiceNode({ service, isExpanded, onToggle, onSelectService, onSelect, selectedKey, searchFilter, onDelete, setConfirmDialog }: ServiceNodeProps) {
  const queryClient = useQueryClient();

  // Lazy fetch environments when service is expanded
  const { data: environments } = useQuery({
    queryKey: ["environments", service.id],
    queryFn: () => servicesApi.listEnvironments(service.id),
    enabled: isExpanded,
  });

  // Add environment inline form
  const [showAddEnv, setShowAddEnv] = useState(false);
  const [newEnvName, setNewEnvName] = useState("");
  const [newEnvUrl, setNewEnvUrl] = useState("");
  const [expandedEnvs, setExpandedEnvs] = useState<Set<string>>(new Set());

  const createEnv = useMutation({
    mutationFn: (data: { name: string; base_url: string }) => servicesApi.createEnvironment(service.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["environments", service.id] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setShowAddEnv(false);
      setNewEnvName("");
      setNewEnvUrl("");
    },
  });

  const deleteEnv = useMutation({
    mutationFn: (envId: string) => servicesApi.deleteEnvironment(envId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["environments", service.id] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });

  const toggleEnv = (id: string) => {
    setExpandedEnvs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div>
      {/* Service row — chevron toggles, label selects + expands */}
      <div className={`group flex items-center pr-1 ${selectedKey === `svc:${service.id}` ? "bg-blue-50" : ""}`}>
        {/* Chevron: toggle only */}
        <button onClick={onToggle} className="pl-3 py-2 pr-1 hover:bg-gray-50 transition-colors">
          <svg className={`w-3 h-3 text-gray-400 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {/* Label: select service + expand */}
        <button onClick={() => { onSelectService(); if (!isExpanded) onToggle(); }}
          className="flex-1 flex items-center gap-1.5 py-2 pr-1 text-left hover:bg-gray-50 transition-colors truncate">
          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
          </svg>
          <span className="text-xs font-semibold text-gray-800 truncate">{service.name}</span>
        </button>
        {/* Action buttons (visible on hover) */}
        <button onClick={() => setShowAddEnv(true)} title="Add environment"
          className="p-1 text-gray-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button onClick={onDelete} title="Delete service"
          className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Expanded: environments */}
      {isExpanded && (
        <div className="ml-3">
          {environments?.map((env: Environment) => (
            <EnvironmentNode
              key={env.id}
              env={env}
              isExpanded={expandedEnvs.has(env.id)}
              onToggle={() => toggleEnv(env.id)}
              onSelectEnv={() => onSelect({ type: "environment", env, serviceId: service.id })}
              onSelect={onSelect}
              selectedKey={selectedKey}
              searchFilter={searchFilter}
              onDelete={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Delete Environment",
                  message: `Delete "${env.name}"? Cached specs and secrets will be removed.`,
                  onConfirm: () => { deleteEnv.mutate(env.id); setConfirmDialog((d) => ({ ...d, isOpen: false })); },
                })
              }
            />
          ))}
          {environments && environments.length === 0 && (
            <p className="px-6 py-1 text-[10px] text-gray-400">No environments</p>
          )}

          {/* Inline add environment form */}
          {showAddEnv && (
            <form onSubmit={(e) => { e.preventDefault(); createEnv.mutate({ name: newEnvName, base_url: newEnvUrl }); }}
              className="mx-2 my-1 p-2 bg-gray-50 rounded border border-gray-200 space-y-1">
              <input type="text" value={newEnvName} onChange={(e) => setNewEnvName(e.target.value)}
                placeholder="Name (e.g. local)" required autoFocus
                className="w-full px-2 py-1 border border-gray-200 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <input type="url" value={newEnvUrl} onChange={(e) => setNewEnvUrl(e.target.value)}
                placeholder="Base URL" required
                className="w-full px-2 py-1 border border-gray-200 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <div className="flex gap-1">
                <button type="submit" className="flex-1 py-0.5 bg-blue-600 text-white rounded text-[10px] font-medium hover:bg-blue-700">Add</button>
                <button type="button" onClick={() => setShowAddEnv(false)} className="px-2 py-0.5 text-[10px] text-gray-500 hover:bg-gray-200 rounded">Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ENVIRONMENT NODE ─────────────────────────────────────────────────────────

interface EnvironmentNodeProps {
  env: Environment;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectEnv: () => void;
  onSelect: (sel: TreeSelection) => void;
  selectedKey: string | null;
  searchFilter: string;
  onDelete: () => void;
}

function EnvironmentNode({ env, isExpanded, onToggle, onSelectEnv, onSelect, selectedKey, searchFilter, onDelete }: EnvironmentNodeProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (type: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  return (
    <div>
      {/* Environment row — chevron toggles, label selects + expands */}
      <div className={`group flex items-center pr-1 ${selectedKey === `env:${env.id}` ? "bg-blue-50" : ""}`}>
        {/* Chevron: toggle only */}
        <button onClick={onToggle} className="pl-3 py-1.5 pr-1 hover:bg-gray-50 transition-colors">
          <svg className={`w-3 h-3 text-gray-400 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {/* Label: select environment + expand */}
        <button onClick={() => { onSelectEnv(); if (!isExpanded) onToggle(); }}
          className="flex-1 flex items-center gap-1.5 py-1.5 pr-1 text-left hover:bg-gray-50 transition-colors truncate">
          <span className="text-xs text-gray-600 truncate">{env.name}</span>
          <span className="text-[9px] text-gray-400 truncate ml-auto">{env.base_url.replace(/https?:\/\//, "").split("/")[0]}</span>
        </button>
        <button onClick={onDelete} title="Delete environment"
          className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Expanded: API and Admin API groups */}
      {isExpanded && (
        <div className="ml-4">
          <SwaggerGroupNode
            envId={env.id}
            baseUrl={env.base_url}
            type="main"
            label="API"
            isExpanded={expandedGroups.has("main")}
            onToggle={() => toggleGroup("main")}
            onSelect={onSelect}
            selectedKey={selectedKey}
            searchFilter={searchFilter}
          />
          <SwaggerGroupNode
            envId={env.id}
            baseUrl={adminBaseUrl(env)}
            type="admin"
            label="Admin API"
            isExpanded={expandedGroups.has("admin")}
            onToggle={() => toggleGroup("admin")}
            onSelect={onSelect}
            selectedKey={selectedKey}
            searchFilter={searchFilter}
          />
        </div>
      )}
    </div>
  );
}

// ─── SWAGGER GROUP NODE (API / Admin API) ─────────────────────────────────────

interface SwaggerGroupNodeProps {
  envId: string;
  baseUrl: string;
  type: SwaggerType;
  label: string;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: (sel: TreeSelection) => void;
  selectedKey: string | null;
  searchFilter: string;
}

function SwaggerGroupNode({ envId, baseUrl, type, label, isExpanded, onToggle, onSelect, selectedKey, searchFilter }: SwaggerGroupNodeProps) {
  const queryClient = useQueryClient();

  // Lazy fetch endpoints only when this group is expanded
  const { data: endpoints, isLoading, isError, error } = useQuery({
    queryKey: ["endpoints", envId, type],
    queryFn: () => swaggerApi.getEndpoints(envId, type),
    enabled: isExpanded,
    retry: 1, // Retry once on failure before showing error
  });

  // Apply search filter to endpoints (guard against null/undefined fields)
  const filtered = endpoints?.filter(
    (ep: EndpointInfo) =>
      !searchFilter ||
      (ep.path || "").toLowerCase().includes(searchFilter.toLowerCase()) ||
      (ep.summary || "").toLowerCase().includes(searchFilter.toLowerCase()) ||
      (ep.method || "").toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div>
      {/* Group header row */}
      <button onClick={onToggle}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left hover:bg-gray-50 transition-colors">
        <svg className={`w-3 h-3 text-gray-400 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className={`text-[11px] font-medium ${type === "admin" ? "text-amber-700" : "text-blue-700"}`}>
          {label}
        </span>
        {/* Endpoint count badge — only show when data loaded successfully */}
        {isExpanded && !isLoading && !isError && filtered && (
          <span className="text-[9px] text-gray-400 ml-auto">{filtered.length}</span>
        )}
        {/* Error indicator icon */}
        {isExpanded && isError && (
          <span className="text-[9px] text-red-400 ml-auto" title="Failed to load">!</span>
        )}
      </button>

      {/* Expanded: endpoint leaves */}
      {isExpanded && (
        <div className="ml-3">
          {isLoading ? (
            <div className="px-3 py-1 space-y-1">
              {[1, 2, 3].map((i) => <div key={i} className="h-5 skeleton rounded" />)}
            </div>
          ) : isError ? (
            /* Error state: swagger fetch failed (502, 504, connection refused, etc.) */
            <div className="px-3 py-1.5">
              <p className="text-[10px] text-red-500">
                {(error as Error)?.message?.includes("502")
                  ? "Service unreachable"
                  : (error as Error)?.message?.includes("504")
                    ? "Request timed out"
                    : "Failed to load endpoints"}
              </p>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["endpoints", envId, type] })}
                className="text-[10px] text-blue-500 hover:underline mt-0.5"
              >
                Retry
              </button>
            </div>
          ) : filtered && filtered.length > 0 ? (
            filtered.map((ep: EndpointInfo, idx: number) => {
              const key = makeEndpointKey(envId, type, ep, idx);
              const isSelected = selectedKey === key;
              const mc = methodColor[ep.method] || "bg-gray-100 text-gray-600";

              return (
                <button
                  key={key}
                  onClick={() => onSelect({ type: "endpoint", endpoint: ep, environmentId: envId, baseUrl, swaggerType: type })}
                  className={`w-full flex items-center gap-1.5 px-2 py-1 text-left rounded transition-all ${
                    isSelected ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-gray-50"
                  }`}
                >
                  <span className={`inline-flex px-1 py-0.5 rounded text-[9px] font-bold shrink-0 w-10 justify-center ${mc}`}>
                    {ep.method}
                  </span>
                  <span className={`font-mono text-[11px] truncate ${isSelected ? "text-gray-900 font-medium" : "text-gray-600"}`}>
                    {ep.path}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="px-3 py-1 text-[10px] text-gray-400">
              {/* Show "No match" only when a search filter is active; otherwise "No endpoints" */}
              {searchFilter ? "No match" : "No endpoints"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
