/**
 * Proxy API calls — execute requests to target services.
 */

import { getApiClient } from "./client";
import type { ProxyRequest, ProxyResponse } from "../types/proxy";

/** Execute an API request through the proxy */
export async function executeRequest(data: ProxyRequest): Promise<ProxyResponse> {
  const client = getApiClient();
  const response = await client.post<ProxyResponse>("/api/proxy/execute", data);
  return response.data;
}
