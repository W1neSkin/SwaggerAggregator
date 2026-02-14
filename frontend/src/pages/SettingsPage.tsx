/**
 * Settings page — redesigned.
 * Manage secrets per environment with a clean card-based layout.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { servicesApi, secretsApi } from "@swagger-aggregator/shared";
import type { Service, Environment } from "@swagger-aggregator/shared";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedEnvId, setSelectedEnvId] = useState("");
  const [jwtSecret, setJwtSecret] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.listServices(),
  });
  const { data: environments } = useQuery({
    queryKey: ["environments", selectedServiceId],
    queryFn: () => servicesApi.listEnvironments(selectedServiceId),
    enabled: !!selectedServiceId,
  });
  const { data: secretStatus } = useQuery({
    queryKey: ["secretStatus", selectedEnvId],
    queryFn: () => secretsApi.getSecretStatus(selectedEnvId),
    enabled: !!selectedEnvId,
  });

  const handleSave = async () => {
    setError(""); setMessage("");
    if (!selectedEnvId) { setError("Please select an environment"); return; }
    const data: { jwt_secret?: string; admin_password?: string } = {};
    if (jwtSecret.trim()) data.jwt_secret = jwtSecret;
    if (adminPassword.trim()) data.admin_password = adminPassword;
    if (Object.keys(data).length === 0) { setError("Please enter at least one secret"); return; }
    try {
      await secretsApi.saveSecrets(selectedEnvId, data);
      setMessage("Secrets saved successfully!");
      setJwtSecret(""); setAdminPassword("");
      queryClient.invalidateQueries({ queryKey: ["secretStatus", selectedEnvId] });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to save secrets");
    }
  };

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage JWT secrets and admin passwords for your environments
        </p>
      </div>

      {/* Info banner */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
        <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-blue-700">
          Storing secrets is <strong>optional</strong>. Save them for local/dev environments and enter manually for stage/prod via the JWT Generator.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 space-y-5">
          {/* Service */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Service</label>
            <select value={selectedServiceId}
              onChange={(e) => { setSelectedServiceId(e.target.value); setSelectedEnvId(""); }}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white">
              <option value="">Select a service...</option>
              {services?.map((svc: Service) => (
                <option key={svc.id} value={svc.id}>{svc.name}</option>
              ))}
            </select>
          </div>

          {/* Environment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Environment</label>
            <select value={selectedEnvId}
              onChange={(e) => setSelectedEnvId(e.target.value)}
              disabled={!selectedServiceId}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-50">
              <option value="">Select an environment...</option>
              {environments?.map((env: Environment) => (
                <option key={env.id} value={env.id}>{env.name} ({env.base_url})</option>
              ))}
            </select>
          </div>

          {/* Secret status */}
          {secretStatus && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Current Status</p>
              <div className="flex gap-6">
                <div className="flex items-center gap-1.5 text-sm">
                  <div className={`w-2 h-2 rounded-full ${secretStatus.has_jwt_secret ? "bg-emerald-500" : "bg-gray-300"}`} />
                  <span className={secretStatus.has_jwt_secret ? "text-gray-700" : "text-gray-400"}>
                    jwt_secret
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <div className={`w-2 h-2 rounded-full ${secretStatus.has_admin_password ? "bg-emerald-500" : "bg-gray-300"}`} />
                  <span className={secretStatus.has_admin_password ? "text-gray-700" : "text-gray-400"}>
                    admin_password
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* JWT Secret */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">JWT Secret</label>
            <input type="password" value={jwtSecret} onChange={(e) => setJwtSecret(e.target.value)}
              placeholder="Enter new jwt_secret (leave empty to keep current)"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
          </div>

          {/* Admin Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Admin Password</label>
            <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Enter new admin_password (leave empty to keep current)"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
          </div>

          {/* Messages */}
          {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">{error}</div>}
          {message && <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm">{message}</div>}
        </div>

        {/* Save button */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button onClick={handleSave} disabled={!selectedEnvId}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold text-sm hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 transition-all">
            Save Secrets
          </button>
        </div>
      </div>
    </div>
  );
}
