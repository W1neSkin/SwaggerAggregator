/**
 * Settings page.
 * Manage secrets (jwt_secret, admin_password) per environment.
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

  // Fetch services
  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.listServices(),
  });

  // Fetch environments for selected service
  const { data: environments } = useQuery({
    queryKey: ["environments", selectedServiceId],
    queryFn: () => servicesApi.listEnvironments(selectedServiceId),
    enabled: !!selectedServiceId,
  });

  // Fetch secret status for selected environment
  const { data: secretStatus } = useQuery({
    queryKey: ["secretStatus", selectedEnvId],
    queryFn: () => secretsApi.getSecretStatus(selectedEnvId),
    enabled: !!selectedEnvId,
  });

  const handleSave = async () => {
    setError("");
    setMessage("");

    if (!selectedEnvId) {
      setError("Please select an environment");
      return;
    }

    // Only send non-empty fields
    const data: { jwt_secret?: string; admin_password?: string } = {};
    if (jwtSecret.trim()) data.jwt_secret = jwtSecret;
    if (adminPassword.trim()) data.admin_password = adminPassword;

    if (Object.keys(data).length === 0) {
      setError("Please enter at least one secret to save");
      return;
    }

    try {
      await secretsApi.saveSecrets(selectedEnvId, data);
      setMessage("Secrets saved successfully!");
      setJwtSecret("");
      setAdminPassword("");
      // Refresh secret status
      queryClient.invalidateQueries({ queryKey: ["secretStatus", selectedEnvId] });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to save secrets");
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <p className="text-gray-500 mb-4">
        Manage your jwt_secret and admin_password for each environment.
        Secrets are encrypted and stored securely.
      </p>
      <div className="mb-8 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
        Storing secrets is optional. You can choose to save them only for
        certain environments (e.g. local, dev) and enter them manually
        when needed for others (e.g. stage, prod) via the JWT Generator page.
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {/* Service selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Service
          </label>
          <select
            value={selectedServiceId}
            onChange={(e) => {
              setSelectedServiceId(e.target.value);
              setSelectedEnvId("");
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a service...</option>
            {services?.map((svc: Service) => (
              <option key={svc.id} value={svc.id}>
                {svc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Environment selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Environment
          </label>
          <select
            value={selectedEnvId}
            onChange={(e) => setSelectedEnvId(e.target.value)}
            disabled={!selectedServiceId}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">Select an environment...</option>
            {environments?.map((env: Environment) => (
              <option key={env.id} value={env.id}>
                {env.name} ({env.base_url})
              </option>
            ))}
          </select>
        </div>

        {/* Secret status indicator */}
        {secretStatus && (
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <p className="font-medium text-gray-700 mb-1">Current Status:</p>
            <div className="flex gap-4">
              <span className={secretStatus.has_jwt_secret ? "text-green-600" : "text-gray-400"}>
                {secretStatus.has_jwt_secret ? "jwt_secret saved" : "jwt_secret not set"}
              </span>
              <span
                className={secretStatus.has_admin_password ? "text-green-600" : "text-gray-400"}
              >
                {secretStatus.has_admin_password
                  ? "admin_password saved"
                  : "admin_password not set"}
              </span>
            </div>
          </div>
        )}

        {/* JWT Secret input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            JWT Secret
          </label>
          <input
            type="password"
            value={jwtSecret}
            onChange={(e) => setJwtSecret(e.target.value)}
            placeholder="Enter new jwt_secret (leave empty to keep current)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Admin Password input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Admin Password
          </label>
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Enter new admin_password (leave empty to keep current)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Messages */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {message}
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!selectedEnvId}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Save Secrets
        </button>
      </div>
    </div>
  );
}
