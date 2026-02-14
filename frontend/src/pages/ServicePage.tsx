/**
 * Service detail page.
 * Shows environments, endpoint list, and swagger browser for a service.
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { servicesApi, swaggerApi } from "@swagger-aggregator/shared";
import type { Environment, EndpointInfo, SwaggerType } from "@swagger-aggregator/shared";
import ConfirmDialog from "../components/ConfirmDialog";
import LoadingSpinner from "../components/LoadingSpinner";
import ExecutePanel from "../components/ExecutePanel";

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
  // Tracks which endpoint is expanded (by operation_id or method+path fallback)
  const [expandedEndpointKey, setExpandedEndpointKey] = useState<string | null>(null);
  // Tracks which endpoint has the execute panel open
  const [executeEndpointKey, setExecuteEndpointKey] = useState<string | null>(null);
  // Confirm dialog state for delete actions
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // Fetch service details
  const { data: service } = useQuery({
    queryKey: ["service", serviceId],
    queryFn: () => servicesApi.getService(serviceId!),
    enabled: !!serviceId,
  });

  // Fetch environments
  const { data: environments } = useQuery({
    queryKey: ["environments", serviceId],
    queryFn: () => servicesApi.listEnvironments(serviceId!),
    enabled: !!serviceId,
  });

  // Fetch endpoints for selected environment
  const { data: endpoints, isLoading: loadingEndpoints } = useQuery({
    queryKey: ["endpoints", selectedEnvId, swaggerType],
    queryFn: () => swaggerApi.getEndpoints(selectedEnvId!, swaggerType),
    enabled: !!selectedEnvId,
  });

  // Create environment mutation
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

  // Delete service mutation
  const deleteService = useMutation({
    mutationFn: () => servicesApi.deleteService(serviceId!),
    onSuccess: () => navigate("/"),
  });

  // Delete environment mutation
  const deleteEnv = useMutation({
    mutationFn: (envId: string) => servicesApi.deleteEnvironment(envId),
    onSuccess: (_, envId) => {
      queryClient.invalidateQueries({ queryKey: ["environments", serviceId] });
      // Reset selected env if we deleted the currently selected one
      if (selectedEnvId === envId) {
        setSelectedEnvId(null);
      }
    },
  });

  // Get the selected environment object (for base_url)
  const selectedEnv = environments?.find((env: Environment) => env.id === selectedEnvId);

  // Filter endpoints by search term
  const filteredEndpoints = endpoints?.filter(
    (ep: EndpointInfo) =>
      ep.path.toLowerCase().includes(searchFilter.toLowerCase()) ||
      ep.summary.toLowerCase().includes(searchFilter.toLowerCase()) ||
      ep.method.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Method color helper
  const methodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: "bg-green-100 text-green-800",
      POST: "bg-blue-100 text-blue-800",
      PUT: "bg-yellow-100 text-yellow-800",
      DELETE: "bg-red-100 text-red-800",
      PATCH: "bg-purple-100 text-purple-800",
    };
    return colors[method] || "bg-gray-100 text-gray-800";
  };

  // Unique key for endpoint (operation_id preferred, fallback to method+path)
  const endpointKey = (ep: EndpointInfo, idx: number) =>
    ep.operation_id || `${ep.method}-${ep.path}-${idx}`;

  // Safely stringify for JSON display
  const formatJson = (obj: unknown) => {
    if (obj == null) return "null";
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  return (
    <div>
      {/* Service header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => navigate("/")}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 block"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{service?.name}</h1>
          {service?.description && (
            <p className="text-gray-500 mt-1">{service.description}</p>
          )}
        </div>
        <button
          onClick={() =>
            setConfirmDialog({
              isOpen: true,
              title: "Delete Service",
              message: "This will delete the service and all its environments. This cannot be undone.",
              onConfirm: () => {
                deleteService.mutate();
                setConfirmDialog((d) => ({ ...d, isOpen: false }));
              },
            })
          }
          className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          Delete Service
        </button>
      </div>

      {/* Environments section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Environments</h2>
          <button
            onClick={() => setShowAddEnv(!showAddEnv)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + Add Environment
          </button>
        </div>

        {/* Add environment form */}
        {showAddEnv && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createEnv.mutate({ name: newEnvName, base_url: newEnvUrl });
            }}
            className="mb-4 bg-white rounded-lg border border-gray-200 p-4 flex gap-3 items-end"
          >
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Name</label>
              <input
                type="text"
                value={newEnvName}
                onChange={(e) => setNewEnvName(e.target.value)}
                placeholder="e.g., local"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-2">
              <label className="block text-xs text-gray-500 mb-1">Base URL</label>
              <input
                type="url"
                value={newEnvUrl}
                onChange={(e) => setNewEnvUrl(e.target.value)}
                placeholder="e.g., http://localhost:8000"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Add
            </button>
          </form>
        )}

        {/* Environment tabs with delete button */}
        <div className="flex gap-2 flex-wrap">
          {environments?.map((env: Environment) => (
            <div
              key={env.id}
              className={`inline-flex items-center gap-1 rounded-lg text-sm font-medium transition-colors ${
                selectedEnvId === env.id
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <button
                onClick={() => setSelectedEnvId(env.id)}
                className="px-4 py-2 rounded-l-lg"
              >
                {env.name}
                <span className="ml-2 text-xs opacity-70">
                  {env.base_url.replace(/https?:\/\//, "").split("/")[0]}
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDialog({
                    isOpen: true,
                    title: "Delete Environment",
                    message: `Delete environment "${env.name}"? All cached specs and secrets for this environment will be removed.`,
                    onConfirm: () => {
                      deleteEnv.mutate(env.id);
                      setConfirmDialog((d) => ({ ...d, isOpen: false }));
                    },
                  });
                }}
                className={`p-2 rounded-r-lg hover:bg-red-500/20 transition-colors ${
                  selectedEnvId === env.id ? "text-white hover:text-red-200" : "text-gray-500 hover:text-red-600"
                }`}
                title="Delete environment"
                aria-label={`Delete ${env.name}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {(!environments || environments.length === 0) && (
            <p className="text-gray-400 text-sm py-2">
              No environments yet. Add one to start browsing endpoints.
            </p>
          )}
        </div>
      </div>

      {/* Swagger type toggle + search */}
      {selectedEnvId && (
        <div className="mb-6 flex items-center gap-4">
          {/* Main / Admin toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setSwaggerType("main")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                swaggerType === "main"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Main API
            </button>
            <button
              onClick={() => setSwaggerType("admin")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                swaggerType === "admin"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Admin API
            </button>
          </div>

          {/* Search filter */}
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search endpoints..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Endpoints list */}
      {selectedEnvId && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loadingEndpoints ? (
            <LoadingSpinner text="Loading endpoints..." />
          ) : filteredEndpoints && filteredEndpoints.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredEndpoints.map((ep: EndpointInfo, idx: number) => {
                const key = endpointKey(ep, idx);
                const isExpanded = expandedEndpointKey === key;

                return (
                  <div key={key}>
                    {/* Endpoint header — click to expand/collapse */}
                    <button
                      onClick={() => setExpandedEndpointKey(isExpanded ? null : key)}
                      className="w-full p-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold shrink-0 ${methodColor(ep.method)}`}
                        >
                          {ep.method}
                        </span>
                        <span className="font-mono text-sm text-gray-800">
                          {ep.path}
                        </span>
                        {/* Expand/collapse indicator */}
                        <span className="ml-auto text-gray-400 text-xs">
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>
                      {ep.summary && (
                        <p className="text-sm text-gray-500 mt-1 ml-16">
                          {ep.summary}
                        </p>
                      )}
                      {ep.tags.length > 0 && (
                        <div className="flex gap-1 mt-2 ml-16">
                          {ep.tags.map((tag: string) => (
                            <span
                              key={tag}
                              className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <div className="px-4 pb-4 ml-16 space-y-3 border-t border-gray-50">
                        {/* Full description */}
                        {ep.description && (
                          <div className="pt-3">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Description</h4>
                            <p className="text-sm text-gray-700">{ep.description}</p>
                          </div>
                        )}

                        {/* Parameters table */}
                        {ep.parameters.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Parameters</h4>
                            <div className="bg-gray-50 rounded-lg overflow-hidden text-xs">
                              <div className="grid grid-cols-4 gap-2 p-2 font-semibold text-gray-600 border-b border-gray-200">
                                <span>Name</span><span>In</span><span>Type</span><span>Required</span>
                              </div>
                              {ep.parameters.map((param: Record<string, unknown>, pIdx: number) => (
                                <div key={pIdx} className="grid grid-cols-4 gap-2 p-2 border-b border-gray-100 last:border-0">
                                  <span className="font-mono text-gray-800">{String(param.name || "")}</span>
                                  <span className="text-gray-500">{String(param.in || "")}</span>
                                  <span className="text-gray-500">{String((param.schema as Record<string, unknown>)?.type || param.type || "")}</span>
                                  <span>{param.required ? "Yes" : "No"}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Request body */}
                        {ep.request_body && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Request Body</h4>
                            <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto max-h-48 font-mono">
                              {formatJson(ep.request_body)}
                            </pre>
                          </div>
                        )}

                        {/* Responses */}
                        {Object.keys(ep.responses).length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Responses</h4>
                            <div className="space-y-1">
                              {Object.entries(ep.responses).map(([code, detail]) => (
                                <div key={code} className="bg-gray-50 rounded-lg p-2 text-xs">
                                  <span className="font-semibold text-gray-700">{code}</span>
                                  {" — "}
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

                        {/* Execute / Try it out button */}
                        <button
                          onClick={() =>
                            setExecuteEndpointKey(executeEndpointKey === key ? null : key)
                          }
                          className={`mt-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                            executeEndpointKey === key
                              ? "bg-gray-200 text-gray-700"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {executeEndpointKey === key ? "Close" : "Try it out"}
                        </button>

                        {/* Execute panel */}
                        {executeEndpointKey === key && selectedEnv && (
                          <ExecutePanel
                            endpoint={ep}
                            baseUrl={selectedEnv.base_url}
                            environmentId={selectedEnv.id}
                            swaggerType={swaggerType}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              {endpoints?.length === 0
                ? "No endpoints found in the swagger spec"
                : "No endpoints match your search"}
            </div>
          )}
        </div>
      )}

      {/* Confirm dialog for delete actions */}
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
