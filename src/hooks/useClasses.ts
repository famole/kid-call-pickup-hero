import { useQuery } from '@tanstack/react-query';
import { getAllClasses } from '@/services/classService';
import { Class } from '@/types';

export const useClasses = () => {
  return useQuery({
    queryKey: ['classes'],
    queryFn: getAllClasses,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes - classes rarely change
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
};
