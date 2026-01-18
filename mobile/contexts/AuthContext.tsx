import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, login as loginUser, register as registerUser, logout as logoutUser, getUser, getToken, setUser } from '@/lib/auth';
import { api } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    company_name: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Vérifier l'authentification au démarrage
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await getToken();
      console.log('checkAuth: token found?', !!token);

      if (token) {
        // 1. D'abord essayer de récupérer depuis le stockage local (rapide)
        const storedUser = await getUser();
        console.log('checkAuth: storedUser found?', !!storedUser);

        if (storedUser) {
          setUserState(storedUser);
          // Optionnel : Rafraîchir les données en arrière-plan
          refreshUserDataQuietly();
        } else {
          // 2. Si pas d'utilisateur stocké, récupérer depuis l'API
          await fetchUserFromApi();
        }
      } else {
        console.log('checkAuth: No token');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshUserDataQuietly() {
    try {
      const userData = await api.get<User>('/users/me');
      if (userData) {
        setUserState(userData);
        await setUser(userData);
      }
    } catch (error) {
      console.log('Background user refresh failed (minor):', error);
      // Ne pas déconnecter ici, c'est juste un rafraîchissement
    }
  }

  async function fetchUserFromApi() {
    try {
      console.log('Fetching user from API...');
      const userData = await api.get<User>('/users/me');
      setUserState(userData);
      await setUser(userData);
    } catch (error: any) {
      console.error('Fetch user failed:', error);
      // Ne déconnecter QUE si c'est une erreur d'auth (401/403)
      // Si c'est une erreur réseau, on garde le token (l'utilisateur pourra réessayer)
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('Token invalid, logging out');
        await logoutUser();
        setUserState(null);
      } else {
        console.log('Network/Server error, keeping session');
        // Optionnel : Afficher un toast/alert
      }
    }
  }

  async function login(email: string, password: string) {
    try {
      await loginUser(email, password);

      // Récupérer les informations utilisateur depuis l'API
      const userData = await api.get<User>('/users/me');

      setUserState(userData);
      await setUser(userData);
    } catch (error: any) {
      throw error;
    }
  }

  async function register(data: {
    email: string;
    password: string;
    full_name: string;
    company_name: string;
  }) {
    try {
      const userData = await registerUser(data);
      // Note: L'API register renvoie l'user créé mais ne connecte pas (pas de token).
      // On doit faire le login ensuite.
      // Si l'API renvoie un token, adapter ici.

      await login(data.email, data.password);
    } catch (error: any) {
      throw error;
    }
  }

  async function logout() {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setUserState(null);
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
