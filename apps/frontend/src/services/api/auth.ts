import { ChangePasswordInput, LoginInput, RegisterInput, UpdateAdminCredentialsInput } from '@rebequi/shared/schemas';
import { AuthResponse, User } from '@rebequi/shared/types';
import { apiFetch } from './client';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
};

function unwrapResponse<T>(response: ApiResponse<T> | T): T {
  if (typeof response === 'object' && response !== null && 'success' in response) {
    const apiResponse = response as ApiResponse<T>;
    if (!apiResponse.success) {
      throw new Error(apiResponse.error || 'Erro na requisicao');
    }
    if (apiResponse.data === undefined) {
      throw new Error('Resposta inesperada da API');
    }
    return apiResponse.data;
  }
  return response as T;
}

export async function login(payload: LoginInput): Promise<AuthResponse> {
  const response = await apiFetch<ApiResponse<AuthResponse> | AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return unwrapResponse<AuthResponse>(response);
}

export async function register(payload: RegisterInput): Promise<AuthResponse> {
  const response = await apiFetch<ApiResponse<AuthResponse> | AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return unwrapResponse<AuthResponse>(response);
}

export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', {
    method: 'POST',
  });
}

export async function updateAdminCredentials(payload: UpdateAdminCredentialsInput): Promise<AuthResponse> {
  const response = await apiFetch<ApiResponse<AuthResponse> | AuthResponse>(
    '/auth/admin/update-credentials',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  return unwrapResponse<AuthResponse>(response);
}

export async function changePassword(payload: ChangePasswordInput): Promise<AuthResponse> {
  const response = await apiFetch<ApiResponse<AuthResponse> | AuthResponse>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return unwrapResponse<AuthResponse>(response);
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiFetch<ApiResponse<User> | User>('/auth/me');
  return unwrapResponse<User>(response);
}
