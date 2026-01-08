import { QueryClient } from '@tanstack/react-query';

// Configuration du QueryClient avec des options par défaut
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Temps de cache par défaut : 5 minutes
      staleTime: 5 * 60 * 1000,
      // Temps avant garbage collection : 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry automatique en cas d'erreur
      retry: 1,
      // Refetch quand la fenêtre reprend le focus
      refetchOnWindowFocus: false,
      // Refetch quand reconnecté au réseau
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry automatique pour les mutations
      retry: 1,
    },
  },
});
