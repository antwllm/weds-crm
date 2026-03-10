const BASE_PATH = '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${BASE_PATH}${path}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (response.status === 401) {
    window.location.href = '/auth/google';
    throw new ApiError('Non authentifie', 401);
  }

  if (!response.ok) {
    let errorMessage = 'Une erreur est survenue';
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.error || errorBody.message || errorMessage;
    } catch {
      // Response body is not JSON
    }
    throw new ApiError(errorMessage, response.status);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
