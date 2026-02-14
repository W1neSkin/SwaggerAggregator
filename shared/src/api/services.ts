/**
 * Services and Environments API calls.
 */

import { getApiClient } from "./client";
import type {
  Service,
  ServiceCreate,
  ServiceUpdate,
  Environment,
  EnvironmentCreate,
  EnvironmentUpdate,
} from "../types/service";

// --- Services ---

export async function listServices(): Promise<Service[]> {
  const client = getApiClient();
  const response = await client.get<Service[]>("/api/services");
  return response.data;
}

export async function getService(serviceId: string): Promise<Service> {
  const client = getApiClient();
  const response = await client.get<Service>(`/api/services/${serviceId}`);
  return response.data;
}

export async function createService(data: ServiceCreate): Promise<Service> {
  const client = getApiClient();
  const response = await client.post<Service>("/api/services", data);
  return response.data;
}

export async function updateService(serviceId: string, data: ServiceUpdate): Promise<Service> {
  const client = getApiClient();
  const response = await client.put<Service>(`/api/services/${serviceId}`, data);
  return response.data;
}

export async function deleteService(serviceId: string): Promise<void> {
  const client = getApiClient();
  await client.delete(`/api/services/${serviceId}`);
}

// --- Environments ---

export async function listEnvironments(serviceId: string): Promise<Environment[]> {
  const client = getApiClient();
  const response = await client.get<Environment[]>(
    `/api/services/${serviceId}/environments`
  );
  return response.data;
}

export async function createEnvironment(
  serviceId: string,
  data: EnvironmentCreate
): Promise<Environment> {
  const client = getApiClient();
  const response = await client.post<Environment>(
    `/api/services/${serviceId}/environments`,
    data
  );
  return response.data;
}

export async function updateEnvironment(
  envId: string,
  data: EnvironmentUpdate
): Promise<Environment> {
  const client = getApiClient();
  const response = await client.put<Environment>(`/api/environments/${envId}`, data);
  return response.data;
}

export async function deleteEnvironment(envId: string): Promise<void> {
  const client = getApiClient();
  await client.delete(`/api/environments/${envId}`);
}
