/**
 * API client configuration and error handling.
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const getAuthHeaders = () => {
  return {};
};

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  try {
    return await response.text();
  } catch {
    return undefined;
  }
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const defaultHeaders: Record<string, string> = {
    ...getAuthHeaders(),
  };

  if (!isFormData) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const config: RequestInit = {
    ...options,
    credentials: options.credentials || 'include',
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const payload = await readResponseBody(response);
      const message =
        (payload &&
          typeof payload === 'object' &&
          ('error' in payload || 'message' in payload) &&
          `${(payload as { error?: string; message?: string }).error || (payload as { message?: string }).message}`) ||
        (typeof payload === 'string' && payload) ||
        `API Error: ${response.status} ${response.statusText}`;

      throw new ApiError(message, response.status, payload);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await readResponseBody(response)) as T;
  } catch (error) {
    console.error('API Fetch Error:', error);
    throw error;
  }
}
