import { useQuery } from '@tanstack/react-query';

/**
 * Hook optimisé pour les requêtes fréquentes avec mise en cache intelligente
 */
export const useOptimizedQuery = (key, queryFn, options = {}) => {
  return useQuery({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn,
    staleTime: options.staleTime || 5 * 60 * 1000, // 5 minutes par défaut
    cacheTime: options.cacheTime || 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    refetchOnMount: options.refetchOnMount ?? false,
    ...options
  });
};

/**
 * Hook pour les données qui changent rarement (ex: utilisateurs, produits)
 */
export const useStaticQuery = (key, queryFn) => {
  return useOptimizedQuery(key, queryFn, {
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 heure
  });
};

/**
 * Hook pour les données en temps réel (ex: pointages, notifications)
 */
export const useRealtimeQuery = (key, queryFn) => {
  return useOptimizedQuery(key, queryFn, {
    staleTime: 30 * 1000, // 30 secondes
    cacheTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60 * 1000, // Rafraîchir chaque minute
  });
};