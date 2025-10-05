
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';
import { getParentsWithStudentsOptimized } from '@/services/parent/optimizedParentQueries';
import { getAllStudents } from '@/services/studentService';
import { logger } from '@/utils/logger'

interface UseOptimizedParentsDataProps {
  userRole?: 'parent' | 'teacher' | 'admin' | 'superadmin' | 'family';
  includeDeleted?: boolean;
  includedRoles?: ('parent' | 'teacher' | 'admin' | 'superadmin' | 'family' | 'other')[];
  searchTerm?: string;
  currentPage?: number;
  pageSize?: number;
}

export const useOptimizedParentsData = ({ 
  userRole = 'parent', 
  includeDeleted = false,
  includedRoles,
  searchTerm = '',
  currentPage = 1,
  pageSize = 50
}: UseOptimizedParentsDataProps) => {
  const { toast } = useToast();
  const [parents, setParents] = useState<ParentWithStudents[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [allStudents, setAllStudents] = useState<Child[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<string>('Initializing...');
  
  // Use ref to track last fetch time to prevent dependency issues
  const lastFetchRef = useRef<number>(0);
  const isInitializedRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Parents are now pre-filtered by backend, no need for frontend filtering
  const filteredParentsByRole = parents;

  logger.info(`Backend returned ${filteredParentsByRole.length} parents filtered by roles:`, includedRoles || [userRole]);

  const loadParents = useCallback(async (forceRefresh = false, search?: string, page?: number) => {
    const now = Date.now();
    if (!forceRefresh && now - lastFetchRef.current < 5000) { // Cache for 5 seconds
      return;
    }

    setIsLoading(true);
    setLoadingProgress('Loading parents data...');
    
    try {
      const startTime = performance.now();
      
      const effectivePage = page || currentPage;
      const effectiveSearch = search !== undefined ? search : searchTerm;
      
      logger.info(`Loading parents data for page: ${effectivePage}, search: "${effectiveSearch}"`);
      
      // Use optimized query with backend role filtering, pagination, and search
      const result = await getParentsWithStudentsOptimized(
        includeDeleted, 
        includedRoles,
        effectivePage,
        pageSize,
        effectiveSearch.trim().length >= 3 ? effectiveSearch : undefined
      );
      
      const loadTime = performance.now() - startTime;
      
      logger.info(`Loaded ${result.parents.length} of ${result.totalCount} parents from backend`);
      
      setParents(result.parents);
      setTotalCount(result.totalCount);
      setLoadingProgress(`Loaded ${result.parents.length} of ${result.totalCount} parents`);
      lastFetchRef.current = now;
      
      if (loadTime > 2000) {
        toast({
          title: "Performance Notice",
          description: `Parents loaded in ${(loadTime / 1000).toFixed(1)}s. Data has been optimized.`,
        });
      }
    } catch (error) {
      logger.error('Failed to load parents:', error);
      setLoadingProgress('Failed to load parents');
      toast({
        title: "Error",
        description: "Failed to load parents data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, includeDeleted, includedRoles, currentPage, pageSize, searchTerm]);

  const loadStudents = useCallback(async () => {
    try {
      setLoadingProgress('Loading students data...');
      const studentsData = await getAllStudents(includeDeleted);
      setAllStudents(studentsData);
      setLoadingProgress(`Loaded ${studentsData.length} students`);
    } catch (error) {
      logger.error('Failed to load students:', error);
      setLoadingProgress('Failed to load students');
      toast({
        title: "Error",
        description: "Failed to load students data",
        variant: "destructive",
      });
    }
  }, [toast, includeDeleted]);

  // Initial load effect
  useEffect(() => {
    if (!isInitializedRef.current) {
      const loadData = async () => {
        setIsLoading(true);
        await Promise.all([loadParents(true), loadStudents()]);
        setIsLoading(false);
        setLoadingProgress('Data loaded successfully');
        isInitializedRef.current = true;
      };
      
      loadData();
    }
  }, [loadParents, loadStudents]);

  // Refetch when includeDeleted, currentPage changes
  useEffect(() => {
    if (isInitializedRef.current) {
      logger.info('Parameters changed - includeDeleted:', includeDeleted, 'page:', currentPage);
      loadParents(true);
    }
  }, [includeDeleted, currentPage, loadParents]);

  // Debounced search effect
  useEffect(() => {
    if (isInitializedRef.current && searchTerm.trim().length >= 3) {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        logger.info('Search term changed to:', searchTerm);
        loadParents(true, searchTerm, 1); // Reset to page 1 on search
      }, 500);
      
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    } else if (isInitializedRef.current && searchTerm.trim().length === 0) {
      // Clear search immediately
      loadParents(true, '', 1);
    }
  }, [searchTerm, loadParents]);

  const onParentAdded = useCallback((newParent: ParentWithStudents) => {
    setParents(prev => [...prev, newParent]);
  }, []);

  const onParentUpdated = useCallback((updatedParent: ParentWithStudents) => {
    setParents(prev => prev.map(p => p.id === updatedParent.id ? updatedParent : p));
  }, []);

  const onImportCompleted = useCallback(() => {
    loadParents(true);
  }, [loadParents]);

  const refetch = useCallback(() => {
    return loadParents(true);
  }, [loadParents]);

  return {
    parents,
    setParents,
    filteredParentsByRole,
    isLoading,
    allStudents,
    loadingProgress,
    totalCount,
    onParentAdded,
    onParentUpdated,
    onImportCompleted,
    refetch
  };
};
