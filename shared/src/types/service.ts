/**
 * Service and Environment TypeScript types.
 * Shared between web and mobile frontends.
 */

/** A registered microservice */
export interface Service {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  environments_count: number;
}

/** Request body for creating a service */
export interface ServiceCreate {
  name: string;
  description?: string;
}

/** Request body for updating a service */
export interface ServiceUpdate {
  name?: string;
  description?: string;
}

/** A deployment environment for a service */
export interface Environment {
  id: string;
  service_id: string;
  name: string;
  base_url: string;
  swagger_path: string;
  admin_swagger_path: string;
  created_at: string;
}

/** Request body for creating an environment */
export interface EnvironmentCreate {
  name: string;
  base_url: string;
  swagger_path?: string;
  admin_swagger_path?: string;
}

/** Request body for updating an environment */
export interface EnvironmentUpdate {
  name?: string;
  base_url?: string;
  swagger_path?: string;
  admin_swagger_path?: string;
}
