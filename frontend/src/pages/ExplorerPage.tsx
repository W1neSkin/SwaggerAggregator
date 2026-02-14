/**
 * ExplorerPage — unified API explorer with tree sidebar and endpoint detail panel.
 * Replaces the old Dashboard + ServicePage flow with a single-page experience.
 */

import { useState } from "react";
import type { EndpointInfo, SwaggerType } from "@swagger-aggregator/shared";
import ApiTreeSidebar, { makeEndpointKey } from "../components/ApiTreeSidebar";
import type { TreeSelection } from "../components/ApiTreeSidebar";
import ExecutePanel from "../components/ExecutePanel";

/** Method badge styles for the detail panel */
const methodStyles: Record<string, string> = {
  GET: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  POST: "bg-blue-50 text-blue-700 ring-blue-200",
  PUT: "bg-amber-50 text-amber-700 ring-amber-200",
  DELETE: "bg-red-50 text-red-700 ring-red-200",
  PATCH: "bg-purple-50 text-purple-700 ring-purple-200",
};

export default function ExplorerPage() {
  // Currently selected endpoint from the tree
  const [selection, setSelection] = useState<TreeSelection | null>(null);
  const [executeOpen, setExecuteOpen] = useState(false);

  // Compute the selected key for highlighting in the tree
  const selectedKey = selection
    ? makeEndpointKey(
        selection.environmentId,
        selection.swaggerType,
        selection.endpoint,
        0 // idx doesn't matter for operation_id-based keys; fallback works for method:path
      )
    : null;

  const handleSelect = (sel: TreeSelection) => {
    setSelection(sel);
    setExecuteOpen(false); // reset execute panel when switching endpoints
  };

  const getMethodStyle = (method: string) =>
    methodStyles[method] || "bg-gray-50 text-gray-700 ring-gray-200";

  const formatJson = (obj: unknown) => {
    try { return JSON.stringify(obj, null, 2); }
    catch { return String(obj); }
  };

  return (
    <div className="flex h-full">
      {/* Left: tree sidebar */}
      <ApiTreeSidebar onSelect={handleSelect} selectedKey={selectedKey} />

      {/* Right: endpoint detail panel */}
      <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
        {!selection ? (
          /* Empty state — no endpoint selected */
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <p className="text-lg font-medium text-gray-400">Select an endpoint</p>
              <p className="text-sm text-gray-300 mt-1">Expand a service in the sidebar to browse endpoints</p>
            </div>
          </div>
        ) : (
          /* Endpoint detail */
          <EndpointDetail
            endpoint={selection.endpoint}
            environmentId={selection.environmentId}
            baseUrl={selection.baseUrl}
            swaggerType={selection.swaggerType}
            executeOpen={executeOpen}
            setExecuteOpen={setExecuteOpen}
            getMethodStyle={getMethodStyle}
            formatJson={formatJson}
          />
        )}
      </div>
    </div>
  );
}

// ─── ENDPOINT DETAIL (right panel) ────────────────────────────────────────────

interface EndpointDetailProps {
  endpoint: EndpointInfo;
  environmentId: string;
  baseUrl: string;
  swaggerType: SwaggerType;
  executeOpen: boolean;
  setExecuteOpen: (v: boolean) => void;
  getMethodStyle: (method: string) => string;
  formatJson: (obj: unknown) => string;
}

function EndpointDetail({
  endpoint, environmentId, baseUrl, swaggerType,
  executeOpen, setExecuteOpen, getMethodStyle, formatJson,
}: EndpointDetailProps) {
  const ms = getMethodStyle(endpoint.method);

  return (
    <div className="p-6 max-w-4xl space-y-5">
      {/* Endpoint title */}
      <div className="flex items-start gap-3">
        <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-bold ring-1 shrink-0 ${ms}`}>
          {endpoint.method}
        </span>
        <div className="min-w-0">
          <p className="font-mono text-base text-gray-900 font-medium break-all">{endpoint.path}</p>
          {endpoint.summary && <p className="text-sm text-gray-500 mt-1">{endpoint.summary}</p>}
          {endpoint.tags.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {endpoint.tags.map((tag: string) => (
                <span key={tag} className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {endpoint.description && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</h4>
          <p className="text-sm text-gray-700">{endpoint.description}</p>
        </div>
      )}

      {/* Parameters table */}
      {endpoint.parameters.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Parameters</h4>
          <div className="bg-white rounded-xl overflow-hidden text-xs border border-gray-100">
            <div className="grid grid-cols-6 gap-2 p-2.5 font-semibold text-gray-500 border-b border-gray-200">
              <span>Name</span><span>In</span><span>Type</span><span>Required</span><span>Description</span><span>Example</span>
            </div>
            {endpoint.parameters.map((param: Record<string, unknown>, pIdx: number) => {
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
      {endpoint.request_body && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Request Body</h4>
          <pre className="bg-white rounded-xl border border-gray-100 p-3 text-xs overflow-auto max-h-48 font-mono text-gray-700">
            {formatJson(endpoint.request_body)}
          </pre>
        </div>
      )}

      {/* Responses */}
      {Object.keys(endpoint.responses).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Responses</h4>
          <div className="space-y-1">
            {Object.entries(endpoint.responses).map(([code, detail]) => (
              <div key={code} className="bg-white rounded-lg border border-gray-100 p-2 text-xs flex items-baseline gap-2">
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
      <div className="border-t border-gray-200 pt-4">
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

        {executeOpen && (
          <ExecutePanel
            endpoint={endpoint}
            baseUrl={baseUrl}
            environmentId={environmentId}
            swaggerType={swaggerType}
          />
        )}
      </div>
    </div>
  );
}
