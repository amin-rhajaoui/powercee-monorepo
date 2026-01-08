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
      if (token) {
        // Vérifier si le token est valide en récupérant les infos utilisateur
        // Pour l'instant, on récupère depuis le stockage local
        const storedUser = await getUser();
        if (storedUser) {
          setUserState(storedUser);
        } else {
          // Si pas d'utilisateur stocké, essayer de récupérer depuis l'API
          try {
            const userData = await api.get<User>('/users/me');
            setUserState(userData);
            await setUser(userData);
          } catch (error) {
            // Token invalide, supprimer
            await logoutUser();
          }
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setIsLoading(false);
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
      setUserState(userData);
      
      // Après l'inscription, connecter automatiquement l'utilisateur
      await login(data.email, data.password);
    } catch (error: any) {
      throw error;
    }
  }

  async function logout() {
    try {
      await logoutUser();
      setUserState(null);
    } catch (error) {
      console.error('Error logging out:', error);
      // Même en cas d'erreur, supprimer l'état local
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
