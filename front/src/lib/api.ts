const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultOptions: RequestInit = {
    credentials: 'include',
    ...options,
    headers: {
      ...(!(options.body instanceof FormData || options.body instanceof URLSearchParams) && {
        'Content-Type': 'application/json',
      }),
      ...options.headers,
    },
  };

  const response = await fetch(url, defaultOptions);

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { detail: response.statusText };
    }
    
    const error = new Error(errorData.detail || response.statusText || 'An error occurred');
    (error as any).status = response.status;
    (error as any).data = errorData;
    throw error;
  }

  return response;
}

export const api = {
  get: (endpoint: string, options?: RequestInit) => 
    apiFetch(endpoint, { ...options, method: 'GET' }),
  
  post: (endpoint: string, body: any, options?: RequestInit) =>
    apiFetch(endpoint, { 
      ...options, 
      method: 'POST', 
      body: (body instanceof FormData || body instanceof URLSearchParams) ? body : JSON.stringify(body),
      headers: (body instanceof FormData || body instanceof URLSearchParams) ? options?.headers : { 'Content-Type': 'application/json', ...options?.headers }
    }),
  
  put: (endpoint: string, body: any, options?: RequestInit) =>
    apiFetch(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: (body instanceof FormData || body instanceof URLSearchParams) ? body : JSON.stringify(body),
      headers: (body instanceof FormData || body instanceof URLSearchParams) ? options?.headers : { 'Content-Type': 'application/json', ...options?.headers }
    }),
  
  patch: (endpoint: string, body: any, options?: RequestInit) =>
    apiFetch(endpoint, { 
      ...options, 
      method: 'PATCH', 
      body: (body instanceof FormData || body instanceof URLSearchParams) ? body : JSON.stringify(body),
      headers: (body instanceof FormData || body instanceof URLSearchParams) ? options?.headers : { 'Content-Type': 'application/json', ...options?.headers }
    }),
  
  delete: (endpoint: string, options?: RequestInit) => 
    apiFetch(endpoint, { ...options, method: 'DELETE' }),
};
