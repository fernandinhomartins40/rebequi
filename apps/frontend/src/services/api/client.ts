/**
 * API Client Configuration
 * Configure this file with your future backend URL and authentication
 */

// TODO: Replace with your actual API base URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// TODO: Configure authentication headers when backend is ready
export const getAuthHeaders = () => {
  // Example: const token = localStorage.getItem('auth_token');
  // return token ? { Authorization: `Bearer ${token}` } : {};
  return {};
};

/**
 * Generic fetch wrapper with error handling
 * Customize this function based on your backend API structure
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

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
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Fetch Error:', error);
    throw error;
  }
}
