/**
 * Service detail page — redesigned.
 * Shows environments, endpoint list with method-colored cards, and swagger browser.
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { servicesApi, swaggerApi } from "@swagger-aggregator/shared";
import type { Environment, EndpointInfo, SwaggerType } from "@swagger-aggregator/shared";
import ConfirmDialog from "../components/ConfirmDialog";
import ExecutePanel from "../components/ExecutePanel";

/** Method badge styles with left-border color accent */
const methodStyles: Record<string, { badge: string; border: string }> = {
  GET:    { badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", border: "border-l-emerald-400" },
  POST:   { badge: "bg-blue-50 text-blue-700 ring-blue-200", border: "border-l-blue-400" },
  PUT:    { badge: "bg-amber-50 text-amber-700 ring-amber-200", border: "border-l-amber-400" },
  DELETE: { badge: "bg-red-50 text-red-700 ring-red-200", border: "border-l-red-400" },
  PATCH:  { badge: "bg-purple-50 text-purple-700 ring-purple-200", border: "border-l-purple-400" },
};

export default function ServicePage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [swaggerType, setSwaggerType] = useState<SwaggerType>("main");
  const [showAddEnv, setShowAddEnv] = useState(false);
  const [newEnvName, setNewEnvName] = useState("");
  const [newEnvUrl, setNewEnvUrl] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  // Selected endpoint in the right panel (replaces expand/collapse)
  const [selectedEndpointKey, setSelectedEndpointKey] = useState<string | null>(null);
  const [executeOpen, setExecuteOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // Queries
  const { data: service } = useQuery({
    queryKey: ["service", serviceId],
    queryFn: () => servicesApi.getService(serviceId!),
    enabled: !!serviceId,
  });
  const { data: environments } = useQuery({
    queryKey: ["environments", serviceId],
    queryFn: () => servicesApi.listEnvironments(serviceId!),
    enabled: !!serviceId,
  });
  const { data: endpoints, isLoading: loadingEndpoints } = useQuery({
    queryKey: ["endpoints", selectedEnvId, swaggerType],
    queryFn: () => swaggerApi.getEndpoints(selectedEnvId!, swaggerType),
    enabled: !!selectedEnvId,
  });

  // Mutations
  const createEnv = useMutation({
    mutationFn: (data: { name: string; base_url: string }) =>
      servicesApi.createEnvironment(serviceId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["environments", serviceId] });
      setShowAddEnv(false);
      setNewEnvName("");
      setNewEnvUrl("");
    },
  });
  const deleteService = useMutation({
    mutationFn: () => servicesApi.deleteService(serviceId!),
    onSuccess: () => navigate("/"),
  });
  const deleteEnv = useMutation({
    mutationFn: (envId: string) => servicesApi.deleteEnvironment(envId),
    onSuccess: (_, envId) => {
      queryClient.invalidateQueries({ queryKey: ["environments", serviceId] });
      if (selectedEnvId === envId) setSelectedEnvId(null);
    },
  });

  const selectedEnv = environments?.find((env: Environment) => env.id === selectedEnvId);

  const filteredEndpoints = endpoints?.filter(
    (ep: EndpointInfo) =>
      ep.path.toLowerCase().includes(searchFilter.toLowerCase()) ||
      ep.summary.toLowerCase().includes(searchFilter.toLowerCase()) ||
      ep.method.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const endpointKey = (ep: EndpointInfo, idx: number) =>
    ep.operation_id || `${ep.method}-${ep.path}-${idx}`;

  const getMethodStyle = (method: string) =>
    methodStyles[method] || { badge: "bg-gray-50 text-gray-700 ring-gray-200", border: "border-l-gray-300" };

  const formatJson = (obj: unknown) => {
    try { return JSON.stringify(obj, null, 2); }
    catch { return String(obj); }
  };

  return (
    <div>
      {/* Breadcrumb + header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-3 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{service?.name}</h1>
            {service?.description && (
              <p className="text-gray-500 text-sm mt-1">{service.description}</p>
            )}
          </div>
          <button
            onClick={() =>
              setConfirmDialog({
                isOpen: true,
                title: "Delete Service",
                message: "This will delete the service and all its environments. This cannot be undone.",
                onConfirm: () => { deleteService.mutate(); setConfirmDialog((d) => ({ ...d, isOpen: false })); },
              })
            }
            className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-all"
          >
            Delete
          </button>
        </div>
      </div>

      {/* === ENVIRONMENTS SECTION === */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Environments</h2>
          <button
            onClick={() => setShowAddEnv(!showAddEnv)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {showAddEnv ? "Cancel" : "+ Add"}
          </button>
        </div>

        {showAddEnv && (
          <form
            onSubmit={(e) => { e.preventDefault(); createEnv.mutate({ name: newEnvName, base_url: newEnvUrl }); }}
            className="mb-4 bg-white rounded-xl border border-gray-100 p-4 flex gap-3 items-end"
          >
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
              <input type="text" value={newEnvName} onChange={(e) => setNewEnvName(e.target.value)}
                placeholder="e.g., local" required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
            </div>
            <div className="flex-[2]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Base URL</label>
              <input type="url" value={newEnvUrl} onChange={(e) => setNewEnvUrl(e.target.value)}
                placeholder="e.g., http://localhost:8000" required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">Add</button>
          </form>
        )}

        <div className="flex gap-2 flex-wrap">
          {environments?.map((env: Environment) => (
            <div key={env.id}
              className={`inline-flex items-center gap-1 rounded-xl text-sm font-medium transition-all ${
                selectedEnvId === env.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:shadow-sm"
              }`}>
              <button onClick={() => setSelectedEnvId(env.id)} className="px-4 py-2 rounded-l-xl">
                {env.name}
                <span className="ml-2 text-xs opacity-60">{env.base_url.replace(/https?:\/\//, "").split("/")[0]}</span>
              </button>
              <button type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDialog({
                    isOpen: true, title: "Delete Environment",
                    message: `Delete environment "${env.name}"? All cached specs and secrets will be removed.`,
                    onConfirm: () => { deleteEnv.mutate(env.id); setConfirmDialog((d) => ({ ...d, isOpen: false })); },
                  });
                }}
                className={`p-2 rounded-r-xl transition-colors ${
                  selectedEnvId === env.id ? "hover:bg-white/20" : "hover:bg-red-50 hover:text-red-500"
                }`}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {(!environments || environments.length === 0) && (
            <p className="text-gray-400 text-sm py-2">No environments yet. Add one to start browsing endpoints.</p>
          )}
        </div>
      </section>

      {/* === SWAGGER TYPE TOGGLE === */}
      {selectedEnvId && (
        <div className="mb-4 flex bg-gray-100 rounded-lg p-1 w-fit">
          {(["main", "admin"] as const).map((t) => (
            <button key={t} onClick={() => { setSwaggerType(t); setSelectedEndpointKey(null); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                swaggerType === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}>
              {t === "main" ? "Main API" : "Admin API"}
            </button>
          ))}
        </div>
      )}

      {/* === TWO-PANEL LAYOUT: endpoint list (left) + detail (right) === */}
      {selectedEnvId && (
        <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[400px]">

          {/* ---- LEFT PANEL: endpoint list ---- */}
          <div className="w-80 shrink-0 flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden">
            {/* Search inside left panel */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text" value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search endpoints..."
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
              {/* Endpoint count */}
              {filteredEndpoints && (
                <p className="text-[10px] text-gray-400 mt-1.5">{filteredEndpoints.length} endpoint{filteredEndpoints.length !== 1 ? "s" : ""}</p>
              )}
            </div>

            {/* Scrollable endpoint list */}
            <div className="flex-1 overflow-y-auto">
              {loadingEndpoints ? (
                <div className="p-3 space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 skeleton rounded-lg" />)}
                </div>
              ) : filteredEndpoints && filteredEndpoints.length > 0 ? (
                <div className="py-1">
                  {filteredEndpoints.map((ep: EndpointInfo, idx: number) => {
                    const key = endpointKey(ep, idx);
                    const ms = getMethodStyle(ep.method);
                    const isSelected = selectedEndpointKey === key;

                    return (
                      <button
                        key={key}
                        onClick={() => { setSelectedEndpointKey(key); setExecuteOpen(false); }}
                        className={`w-full text-left px-3 py-2.5 flex items-center gap-2 border-l-3 transition-all ${
                          isSelected
                            ? `bg-blue-50/70 border-l-blue-500`
                            : `border-l-transparent hover:bg-gray-50`
                        }`}
                      >
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ring-1 shrink-0 w-14 justify-center ${ms.badge}`}>
                          {ep.method}
                        </span>
                        <span className={`font-mono text-xs truncate ${isSelected ? "text-gray-900 font-medium" : "text-gray-600"}`}>
                          {ep.path}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-gray-400 text-xs">
                    {endpoints?.length === 0 ? "No endpoints found" : "No match"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ---- RIGHT PANEL: endpoint detail ---- */}
          <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-100">
            {(() => {
              // Find the selected endpoint object
              const selectedEp = filteredEndpoints?.find(
                (ep: EndpointInfo, idx: number) => endpointKey(ep, idx) === selectedEndpointKey
              );

              if (!selectedEp) {
                return (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                      <p className="text-sm">Select an endpoint from the list</p>
                    </div>
                  </div>
                );
              }

              const ms = getMethodStyle(selectedEp.method);

              return (
                <div className="p-5 space-y-5">
                  {/* Endpoint title */}
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-bold ring-1 shrink-0 ${ms.badge}`}>
                      {selectedEp.method}
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-base text-gray-900 font-medium break-all">{selectedEp.path}</p>
                      {selectedEp.summary && <p className="text-sm text-gray-500 mt-1">{selectedEp.summary}</p>}
                      {selectedEp.tags.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {selectedEp.tags.map((tag: string) => (
                            <span key={tag} className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {selectedEp.description && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</h4>
                      <p className="text-sm text-gray-700">{selectedEp.description}</p>
                    </div>
                  )}

                  {/* Parameters */}
                  {selectedEp.parameters.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Parameters</h4>
                      <div className="bg-gray-50 rounded-xl overflow-hidden text-xs border border-gray-100">
                        <div className="grid grid-cols-6 gap-2 p-2.5 font-semibold text-gray-500 border-b border-gray-200">
                          <span>Name</span><span>In</span><span>Type</span><span>Required</span><span>Description</span><span>Example</span>
                        </div>
                        {selectedEp.parameters.map((param: Record<string, unknown>, pIdx: number) => {
                          const schema = param.schema as Record<string, unknown> | undefined;
                          const example = param.example ?? schema?.example ?? schema?.default ?? "";
                          const description = param.description ?? "";
                          return (
                            <div key={pIdx} className="grid grid-cols-6 gap-2 p-2.5 border-b border-gray-100 last:border-0">
                              <span className="font-mono text-gray-800 font-medium">{String(param.name || "")}</span>
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
                  {selectedEp.request_body && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Request Body</h4>
                      <pre className="bg-gray-50 rounded-xl border border-gray-100 p-3 text-xs overflow-auto max-h-48 font-mono text-gray-700">
                        {formatJson(selectedEp.request_body)}
                      </pre>
                    </div>
                  )}

                  {/* Responses */}
                  {Object.keys(selectedEp.responses).length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Responses</h4>
                      <div className="space-y-1">
                        {Object.entries(selectedEp.responses).map(([code, detail]) => (
                          <div key={code} className="bg-gray-50 rounded-lg border border-gray-100 p-2 text-xs flex items-baseline gap-2">
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

                  {/* Try it out button + execute panel */}
                  <div className="border-t border-gray-100 pt-4">
                    <button
                      onClick={() => setExecuteOpen(!executeOpen)}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        executeOpen
                          ? "bg-gray-100 text-gray-600"
                          : "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {executeOpen ? "Close" : "Try it out"}
                    </button>

                    {executeOpen && selectedEnv && (
                      <ExecutePanel endpoint={selectedEp} baseUrl={selectedEnv.base_url} environmentId={selectedEnv.id} swaggerType={swaggerType} />
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

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
