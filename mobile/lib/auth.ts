import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { api, apiClient, setTokens, getAccessToken, clearTokens } from './api';

const TOKEN_KEY = '@powercee:access_token';
const USER_KEY = '@powercee:user';
const REFRESH_TOKEN_KEY = 'refresh_token';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  tenant_id: string;
  is_active: boolean;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  message: string;
}

/**
 * Stocke le token d'authentification
 * Utilise SecureStore pour le refresh token et mémoire pour l'access token
 */
export async function setToken(token: string, refreshToken?: string): Promise<void> {
  // Stocker l'access token en mémoire via l'API client
  await setTokens(token, refreshToken);
  // Garder aussi dans AsyncStorage pour compatibilité
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

/**
 * Récupère le token d'authentification
 * Priorité: mémoire (via api client) > AsyncStorage
 */
export async function getToken(): Promise<string | null> {
  // D'abord vérifier en mémoire
  const memToken = getAccessToken();
  if (memToken) {
    return memToken;
  }
  // Sinon, vérifier AsyncStorage
  return await AsyncStorage.getItem(TOKEN_KEY);
}

/**
 * Supprime le token d'authentification
 */
export async function removeToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Error removing refresh token:', error);
  }
}

/**
 * Stocke les informations de l'utilisateur
 */
export async function setUser(user: User): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Récupère les informations de l'utilisateur
 */
export async function getUser(): Promise<User | null> {
  const userStr = await AsyncStorage.getItem(USER_KEY);
  if (!userStr) return null;
  return JSON.parse(userStr);
}

/**
 * Supprime les informations de l'utilisateur
 */
export async function removeUser(): Promise<void> {
  await AsyncStorage.removeItem(USER_KEY);
}

/**
 * Connecte un utilisateur avec email et mot de passe
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', password);

  // Utiliser apiClient directement pour avoir le contrôle sur les headers
  const response = await apiClient.post<LoginResponse>(
    '/auth/login',
    params.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
    }
  );

  const data = response.data;

  // Stocker le token (access en mémoire, refresh dans SecureStore)
  await setToken(data.access_token, data.refresh_token);

  return data;
}

/**
 * Inscrit un nouvel utilisateur
 */
export async function register(data: {
  email: string;
  password: string;
  full_name: string;
  company_name: string;
}): Promise<User> {
  // api.post retourne déjà les données (pas besoin de .json())
  const user: User = await api.post<User>('/auth/register', data);

  // Stocker les informations utilisateur
  await setUser(user);

  return user;
}

/**
 * Déconnecte l'utilisateur
 */
export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout', {});
  } catch (error) {
    // Ignorer les erreurs de déconnexion (token peut être expiré)
    console.log('Logout error (ignored):', error);
  } finally {
    // Toujours supprimer le token localement
    await removeToken();
    await removeUser();
    // Nettoyer aussi via l'API client
    await clearTokens();
  }
}

/**
 * Vérifie si l'utilisateur est authentifié
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return token !== null;
}
