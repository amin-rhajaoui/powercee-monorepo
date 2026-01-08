import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Types génériques pour les hooks CRUD
type QueryKey = readonly unknown[];

/**
 * Hook générique pour les requêtes GET (liste)
 */
export function useList<TData = unknown>(
  queryKey: QueryKey,
  endpoint: string,
  options?: Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TData>({
    queryKey,
    queryFn: () => api.get<TData>(endpoint),
    ...options,
  });
}

/**
 * Hook générique pour les requêtes GET (détail)
 */
export function useDetail<TData = unknown>(
  queryKey: QueryKey,
  endpoint: string,
  options?: Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TData>({
    queryKey,
    queryFn: () => api.get<TData>(endpoint),
    enabled: !!endpoint,
    ...options,
  });
}

/**
 * Hook générique pour les mutations CREATE
 */
export function useCreate<TData = unknown, TVariables = unknown>(
  queryKey: QueryKey,
  endpoint: string,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: (data: TVariables) => api.post<TData>(endpoint, data),
    onSuccess: () => {
      // Invalider la liste pour refetch
      queryClient.invalidateQueries({ queryKey });
    },
    ...options,
  });
}

/**
 * Hook générique pour les mutations UPDATE
 */
export function useUpdate<TData = unknown, TVariables = unknown>(
  queryKey: QueryKey,
  endpoint: string,
  options?: Omit<UseMutationOptions<TData, Error, TVariables & { id: string }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables & { id: string }>({
    mutationFn: ({ id, ...data }: TVariables & { id: string }) =>
      api.put<TData>(`${endpoint}/${id}`, data),
    onSuccess: (_, variables) => {
      // Invalider la liste et le détail
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: [...queryKey, variables.id] });
    },
    ...options,
  });
}

/**
 * Hook générique pour les mutations PATCH
 */
export function usePatch<TData = unknown, TVariables = unknown>(
  queryKey: QueryKey,
  endpoint: string,
  options?: Omit<UseMutationOptions<TData, Error, TVariables & { id: string }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables & { id: string }>({
    mutationFn: ({ id, ...data }: TVariables & { id: string }) =>
      api.patch<TData>(`${endpoint}/${id}`, data),
    onSuccess: (_, variables) => {
      // Invalider la liste et le détail
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: [...queryKey, variables.id] });
    },
    ...options,
  });
}

/**
 * Hook générique pour les mutations DELETE
 */
export function useDelete<TData = unknown>(
  queryKey: QueryKey,
  endpoint: string,
  options?: Omit<UseMutationOptions<TData, Error, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, string>({
    mutationFn: (id: string) => api.delete<TData>(`${endpoint}/${id}`),
    onSuccess: () => {
      // Invalider la liste
      queryClient.invalidateQueries({ queryKey });
    },
    ...options,
  });
}
