import type {
  CreateManagedUserDTO,
  ManagedUserFilters,
  ManagedUserResponse,
  UpdateManagedUserDTO,
  User,
} from '@rebequi/shared/types';
import { apiFetch } from './client';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

function isApiResponse<T>(payload: unknown): payload is ApiResponse<T> {
  return typeof payload === 'object' && payload !== null && 'success' in payload;
}

function unwrapData<T>(payload: unknown): T {
  if (isApiResponse<T>(payload)) {
    if (!payload.success) {
      throw new Error(payload.error || payload.message || 'Erro na API');
    }

    if (payload.data === undefined) {
      throw new Error('Resposta inesperada da API');
    }

    return payload.data;
  }

  return payload as T;
}

function buildUsersQuery(filters?: ManagedUserFilters) {
  const params = new URLSearchParams();

  if (filters?.search) params.append('search', filters.search);
  if (filters?.role) params.append('role', filters.role);
  if (filters?.includeInactive !== undefined) params.append('includeInactive', String(filters.includeInactive));
  if (filters?.page !== undefined) params.append('page', String(filters.page));
  if (filters?.limit !== undefined) params.append('limit', String(filters.limit));

  return params.toString();
}

export async function fetchManagedUsers(filters?: ManagedUserFilters): Promise<ManagedUserResponse> {
  const queryString = buildUsersQuery(filters);
  const url = queryString ? `/users?${queryString}` : '/users';
  const response = await apiFetch<ApiResponse<ManagedUserResponse> | ManagedUserResponse>(url);
  return unwrapData<ManagedUserResponse>(response);
}

export async function createManagedUser(payload: CreateManagedUserDTO): Promise<User> {
  const response = await apiFetch<ApiResponse<User> | User>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return unwrapData<User>(response);
}

export async function updateManagedUser(id: string, payload: UpdateManagedUserDTO): Promise<User> {
  const response = await apiFetch<ApiResponse<User> | User>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  return unwrapData<User>(response);
}
