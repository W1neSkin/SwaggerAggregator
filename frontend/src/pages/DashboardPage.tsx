/**
 * Dashboard page — redesigned.
 * Shows service cards with color accents, stats, and animated hover effects.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { servicesApi } from "@swagger-aggregator/shared";
import type { Service } from "@swagger-aggregator/shared";

/** Color palette for service cards — cycles through these */
const cardAccents = [
  { border: "border-l-blue-500", bg: "bg-blue-50", text: "text-blue-700", badge: "bg-blue-100 text-blue-700" },
  { border: "border-l-purple-500", bg: "bg-purple-50", text: "text-purple-700", badge: "bg-purple-100 text-purple-700" },
  { border: "border-l-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700" },
  { border: "border-l-amber-500", bg: "bg-amber-50", text: "text-amber-700", badge: "bg-amber-100 text-amber-700" },
  { border: "border-l-rose-500", bg: "bg-rose-50", text: "text-rose-700", badge: "bg-rose-100 text-rose-700" },
  { border: "border-l-cyan-500", bg: "bg-cyan-50", text: "text-cyan-700", badge: "bg-cyan-100 text-cyan-700" },
];

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

  // Loading skeleton
  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-40 skeleton rounded-lg" />
            <div className="h-4 w-24 skeleton rounded mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 skeleton rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-500 text-sm mt-1">
            {services?.length || 0} service{(services?.length || 0) !== 1 ? "s" : ""} registered
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold text-sm hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Service
        </button>
      </div>

      {/* Add service form — slide-down animation */}
      {showAddForm && (
        <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-[fadeIn_0.2s_ease]">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">New Service</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                placeholder="e.g., user-service"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                placeholder="e.g., Main user management service"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createService.isPending}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {createService.isPending ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
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
          {services.map((service: Service, index: number) => {
            const accent = cardAccents[index % cardAccents.length];
            return (
              <Link
                key={service.id}
                to={`/service/${service.id}`}
                className={`group bg-white rounded-2xl border border-gray-100 border-l-4 ${accent.border} p-5 card-hover block`}
              >
                {/* Service icon + name */}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${accent.bg} flex items-center justify-center shrink-0`}>
                    <svg className={`w-5 h-5 ${accent.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                      {service.name}
                    </h3>
                    {service.description && (
                      <p className="text-gray-500 text-sm mt-0.5 line-clamp-2">{service.description}</p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 flex items-center justify-between">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${accent.badge}`}>
                    {service.environments_count} environment{service.environments_count !== 1 ? "s" : ""}
                  </span>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
            </svg>
          </div>
          <p className="text-gray-500 text-lg font-medium">No services yet</p>
          <p className="text-gray-400 text-sm mt-1 max-w-xs mx-auto">
            Add your first microservice to start aggregating Swagger specs
          </p>
        </div>
      )}
    </div>
  );
}
