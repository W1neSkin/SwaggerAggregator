/**
 * Service detail page.
 * Shows environments, endpoint list, and swagger browser for a service.
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { servicesApi, swaggerApi } from "@swagger-aggregator/shared";
import type { Environment, EndpointInfo, SwaggerType } from "@swagger-aggregator/shared";

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
          onClick={() => {
            if (confirm("Delete this service and all its environments?")) {
              deleteService.mutate();
            }
          }}
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

        {/* Environment tabs */}
        <div className="flex gap-2 flex-wrap">
          {environments?.map((env: Environment) => (
            <button
              key={env.id}
              onClick={() => setSelectedEnvId(env.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedEnvId === env.id
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {env.name}
              <span className="ml-2 text-xs opacity-70">
                {env.base_url.replace(/https?:\/\//, "").split("/")[0]}
              </span>
            </button>
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
            <div className="p-8 text-center text-gray-500">
              Loading endpoints...
            </div>
          ) : filteredEndpoints && filteredEndpoints.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredEndpoints.map((ep: EndpointInfo, idx: number) => (
                <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${methodColor(ep.method)}`}
                    >
                      {ep.method}
                    </span>
                    <span className="font-mono text-sm text-gray-800">
                      {ep.path}
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
                </div>
              ))}
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
    </div>
  );
}
