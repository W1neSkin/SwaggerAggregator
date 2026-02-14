/**
 * JWT Generator page — redesigned.
 * Clean card layout with visual hierarchy and better UX.
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
  const [secretMode, setSecretMode] = useState<"stored" | "manual">("stored");
  const [manualSecret, setManualSecret] = useState("");

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

  const handleGenerate = async () => {
    setError("");
    setGeneratedToken("");
    setTokenPayload(null);
    if (!selectedEnvId || !userId) { setError("Please select an environment and enter a user ID"); return; }
    if (secretMode === "manual" && !manualSecret.trim()) { setError("Please enter a JWT secret"); return; }
    try {
      const result = await secretsApi.generateJwt({
        environment_id: selectedEnvId,
        user_id_value: userId,
        ...(secretMode === "manual" ? { jwt_secret: manualSecret } : {}),
      });
      setGeneratedToken(result.token);
      setTokenPayload(result.payload);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to generate JWT.");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">JWT Generator</h1>
        <p className="text-gray-500 text-sm mt-1">
          Generate JWT tokens for authenticating with your services
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 space-y-5">
          {/* Service */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Service</label>
            <select
              value={selectedServiceId}
              onChange={(e) => { setSelectedServiceId(e.target.value); setSelectedEnvId(""); }}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="">Select a service...</option>
              {services?.map((svc: Service) => (
                <option key={svc.id} value={svc.id}>{svc.name}</option>
              ))}
            </select>
          </div>

          {/* Environment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Environment</label>
            <select
              value={selectedEnvId}
              onChange={(e) => setSelectedEnvId(e.target.value)}
              disabled={!selectedServiceId}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-50"
            >
              <option value="">Select an environment...</option>
              {environments?.map((env: Environment) => (
                <option key={env.id} value={env.id}>{env.name} ({env.base_url})</option>
              ))}
            </select>
          </div>

          {/* User ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              User ID <span className="text-gray-400 font-normal">(JWT "sub" claim)</span>
            </label>
            <input
              type="text" value={userId} onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Secret source toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">JWT Secret Source</label>
            <div className="flex bg-gray-100 rounded-xl p-1">
              {(["stored", "manual"] as const).map((mode) => (
                <button key={mode} onClick={() => setSecretMode(mode)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    secretMode === mode ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                  }`}>
                  {mode === "stored" ? "Use Stored" : "Enter Manually"}
                </button>
              ))}
            </div>

            {secretMode === "stored" && selectedEnvId && (
              <div className="mt-2 text-xs">
                {secretStatus?.has_jwt_secret ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    jwt_secret saved
                  </span>
                ) : (
                  <span className="text-amber-600">No stored secret. Save one in Settings or switch to manual.</span>
                )}
              </div>
            )}

            {secretMode === "manual" && (
              <div className="mt-2">
                <input type="password" value={manualSecret} onChange={(e) => setManualSecret(e.target.value)}
                  placeholder="Enter jwt_secret (will NOT be stored)"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
                <p className="text-xs text-gray-400 mt-1.5">Used for this request only. Not saved.</p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">{error}</div>
          )}
        </div>

        {/* Generate button — full-width footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button onClick={handleGenerate}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold text-sm hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/20 transition-all">
            Generate JWT
          </button>
        </div>
      </div>

      {/* Result */}
      {generatedToken && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Generated Token</h3>
            <button onClick={handleCopy}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="p-6 space-y-4">
            <textarea readOnly value={generatedToken} rows={4}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs resize-none" />
            {tokenPayload && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Payload</h4>
                <pre className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono overflow-auto">
                  {JSON.stringify(tokenPayload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
