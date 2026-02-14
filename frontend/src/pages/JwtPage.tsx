/**
 * JWT Generator page.
 * Allows users to generate JWT tokens for external services.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { servicesApi, secretsApi } from "@swagger-aggregator/shared";
import type { Service, Environment } from "@swagger-aggregator/shared";

export default function JwtPage() {
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedEnvId, setSelectedEnvId] = useState("");
  const [userId, setUserId] = useState("");
  const [generatedToken, setGeneratedToken] = useState("");
  const [tokenPayload, setTokenPayload] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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

  const handleGenerate = async () => {
    setError("");
    setGeneratedToken("");
    setTokenPayload(null);

    if (!selectedEnvId || !userId) {
      setError("Please select an environment and enter a user ID");
      return;
    }

    try {
      const result = await secretsApi.generateJwt({
        environment_id: selectedEnvId,
        user_id_value: userId,
      });
      setGeneratedToken(result.token);
      setTokenPayload(result.payload);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Failed to generate JWT. Make sure jwt_secret is saved for this environment."
      );
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">JWT Generator</h1>
      <p className="text-gray-500 mb-8">
        Generate JWT tokens for external services using stored jwt_secret.
      </p>

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

        {/* User ID input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            User ID (will be stored in JWT "sub" claim)
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Generate JWT
        </button>

        {/* Generated token display */}
        {generatedToken && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Generated Token
              </label>
              <div className="relative">
                <textarea
                  readOnly
                  value={generatedToken}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-xs"
                />
                <button
                  onClick={handleCopy}
                  className="absolute top-2 right-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Token payload preview */}
            {tokenPayload && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payload
                </label>
                <pre className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs overflow-auto">
                  {JSON.stringify(tokenPayload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
