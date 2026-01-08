import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

// Configuration de l'API
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// Clés de stockage
const REFRESH_TOKEN_KEY = 'refresh_token';
const ACCESS_TOKEN_KEY = 'access_token';

// Instance axios de base
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Variable pour stocker le token en mémoire
let accessToken: string | null = null;

// Variable pour éviter les boucles de refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (error?: unknown) => void;
}> = [];

// Fonction pour traiter la queue des requêtes en attente
const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Fonction pour obtenir le refresh token depuis SecureStore
const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting refresh token:', error);
    return null;
  }
};

// Fonction pour sauvegarder les tokens
export const setTokens = async (access: string, refresh?: string) => {
  accessToken = access;
  if (refresh) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
  }
};

// Fonction pour récupérer le token d'accès
export const getAccessToken = (): string | null => {
  return accessToken;
};

// Fonction pour supprimer les tokens
export const clearTokens = async () => {
  accessToken = null;
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Error clearing tokens:', error);
  }
};

// Fonction pour rafraîchir le token
const refreshAccessToken = async (): Promise<string | null> => {
  if (isRefreshing) {
    // Si un refresh est déjà en cours, attendre
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    }) as Promise<string | null>;
  }

  isRefreshing = true;
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    isRefreshing = false;
    const error = new Error('No refresh token available') as AxiosError;
    processQueue(error);
    return null;
  }

  try {
    // Appel à l'endpoint de refresh (à adapter selon votre backend)
    // Note: Si votre backend n'a pas d'endpoint /auth/refresh, 
    // vous devrez peut-être reconnecter l'utilisateur
    const response = await axios.post(
      `${API_URL}/auth/refresh`,
      { refresh_token: refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    const { access_token, refresh_token: newRefreshToken } = response.data;
    
    if (access_token) {
      accessToken = access_token;
      if (newRefreshToken) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);
      }
      isRefreshing = false;
      processQueue(null, access_token);
      return access_token;
    }

    throw new Error('No access token in refresh response');
  } catch (error) {
    isRefreshing = false;
    const axiosError = error as AxiosError;
    processQueue(axiosError);
    await clearTokens();
    return null;
  }
};

// Intercepteur de requête : ajouter le token Bearer
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur de réponse : gérer les erreurs 401 et refresh automatique
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Si erreur 401 et pas déjà retenté
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Essayer de rafraîchir le token
      const newToken = await refreshAccessToken();

      if (newToken && originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }

      // Si le refresh échoue, rediriger vers login
      await clearTokens();
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

// Export des méthodes CRUD typées
export const api = {
  get: <T = unknown>(url: string, config?: InternalAxiosRequestConfig) =>
    apiClient.get<T>(url, config).then((res) => res.data),

  post: <T = unknown>(url: string, data?: unknown, config?: InternalAxiosRequestConfig) =>
    apiClient.post<T>(url, data, config).then((res) => res.data),

  put: <T = unknown>(url: string, data?: unknown, config?: InternalAxiosRequestConfig) =>
    apiClient.put<T>(url, data, config).then((res) => res.data),

  patch: <T = unknown>(url: string, data?: unknown, config?: InternalAxiosRequestConfig) =>
    apiClient.patch<T>(url, data, config).then((res) => res.data),

  delete: <T = unknown>(url: string, config?: InternalAxiosRequestConfig) =>
    apiClient.delete<T>(url, config).then((res) => res.data),
};
