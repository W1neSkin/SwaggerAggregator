/**
 * Dashboard page.
 * Shows a grid of all registered services with quick stats.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { servicesApi } from "@swagger-aggregator/shared";
import type { Service } from "@swagger-aggregator/shared";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Fetch all services
  const { data: services, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.listServices(),
  });

  // Create service mutation
  const createService = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      servicesApi.createService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setShowAddForm(false);
      setNewName("");
      setNewDescription("");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createService.mutate({ name: newName, description: newDescription });
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading services...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-500 mt-1">
            {services?.length || 0} services registered
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          + Add Service
        </button>
      </div>

      {/* Add service form */}
      {showAddForm && (
        <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Add New Service</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., base-agent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Main AI agent service"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createService.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {createService.isPending ? "Creating..." : "Create Service"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Services grid */}
      {services && services.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service: Service) => (
            <Link
              key={service.id}
              to={`/service/${service.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-200 transition-all"
            >
              <h3 className="text-lg font-semibold text-gray-900">
                {service.name}
              </h3>
              {service.description && (
                <p className="text-gray-500 text-sm mt-1">{service.description}</p>
              )}
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                  {service.environments_count} environments
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 text-lg">No services yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Click "Add Service" to register your first microservice
          </p>
        </div>
      )}
    </div>
  );
}
