const API_URL = typeof window === "undefined"
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  : "/api/proxy";

// Type pour les erreurs API avec status et data
export interface ApiError extends Error {
  status: number;
  data: { detail?: string; [key: string]: unknown };
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const url = `${API_URL}/${cleanEndpoint}`;

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
    let errorData: { detail?: string; [key: string]: unknown };
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }

    const error = new Error(errorData.detail || response.statusText || 'An error occurred') as ApiError;
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  return response;
}

/**
 * Convertit une URL S3 en URL proxy pour servir l'image via le backend.
 * Utilise une route API Next.js dediee qui transmet les cookies cote serveur.
 * @param s3Url URL S3 complete (ex: https://bucket.s3.region.amazonaws.com/path/to/file.png)
 * @returns URL proxy (ex: /api/image?path=path/to/file.png)
 */
export function s3UrlToProxyUrl(s3Url: string): string {
  if (!s3Url) return s3Url;

  // Si c'est deja une URL proxy, la retourner telle quelle
  if (s3Url.startsWith('/api/')) {
    return s3Url;
  }

  // Si c'est une URL relative (deja un chemin), la convertir en proxy
  if (s3Url.startsWith('/')) {
    return `/api/image?path=${encodeURIComponent(s3Url.slice(1))}`;
  }

  try {
    const url = new URL(s3Url);
    // Extraire le chemin S3 (tout apres le hostname)
    const s3Path = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;

    // Retourner l'URL de la route API Next.js qui transmet les cookies
    return `/api/image?path=${encodeURIComponent(s3Path)}`;
  } catch {
    // Si ce n'est pas une URL valide, essayer de la traiter comme un chemin relatif
    return `/api/image?path=${encodeURIComponent(s3Url)}`;
  }
}

type RequestBody = Record<string, unknown> | FormData | URLSearchParams;

export const api = {
  get: (endpoint: string, options?: RequestInit) =>
    apiFetch(endpoint, { ...options, method: 'GET' }),

  post: (endpoint: string, body: RequestBody, options?: RequestInit) =>
    apiFetch(endpoint, {
      ...options,
      method: 'POST',
      body: (body instanceof FormData || body instanceof URLSearchParams) ? body : JSON.stringify(body),
      headers: (body instanceof FormData || body instanceof URLSearchParams) ? options?.headers : { 'Content-Type': 'application/json', ...options?.headers }
    }),

  put: (endpoint: string, body: RequestBody, options?: RequestInit) =>
    apiFetch(endpoint, {
      ...options,
      method: 'PUT',
      body: (body instanceof FormData || body instanceof URLSearchParams) ? body : JSON.stringify(body),
      headers: (body instanceof FormData || body instanceof URLSearchParams) ? options?.headers : { 'Content-Type': 'application/json', ...options?.headers }
    }),

  patch: (endpoint: string, body: RequestBody, options?: RequestInit) =>
    apiFetch(endpoint, {
      ...options,
      method: 'PATCH',
      body: (body instanceof FormData || body instanceof URLSearchParams) ? body : JSON.stringify(body),
      headers: (body instanceof FormData || body instanceof URLSearchParams) ? options?.headers : { 'Content-Type': 'application/json', ...options?.headers }
    }),

  delete: (endpoint: string, options?: RequestInit) =>
    apiFetch(endpoint, { ...options, method: 'DELETE' }),
};
