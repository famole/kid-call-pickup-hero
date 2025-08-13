
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';
import { getParentsWithStudentsOptimized } from '@/services/parent/optimizedParentQueries';
import { getAllStudents } from '@/services/studentService';

interface UseOptimizedParentsDataProps {
  userRole?: 'parent' | 'teacher' | 'admin' | 'superadmin';
  includeDeleted?: boolean;
}

export const useOptimizedParentsData = ({ userRole = 'parent', includeDeleted = false }: UseOptimizedParentsDataProps) => {
  const { toast } = useToast();
  const [parents, setParents] = useState<ParentWithStudents[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allStudents, setAllStudents] = useState<Child[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<string>('Initializing...');
  
  // Use ref to track last fetch time to prevent dependency issues
  const lastFetchRef = useRef<number>(0);
  const isInitializedRef = useRef<boolean>(false);

  // Filter parents by role with improved logic
  const filteredParentsByRole = parents.filter(parent => {
    console.log(`Filtering parent ${parent.name} with role: ${parent.role} for userRole: ${userRole}`);
    
    if (userRole === 'superadmin') {
      return parent.role === 'superadmin';
    } else if (userRole === 'teacher') {
      return parent.role === 'teacher';
    } else if (userRole === 'admin') {
      return parent.role === 'admin';
    } else {
      // For 'parent' role, include those with 'parent' role or no role set
      return parent.role === 'parent' || !parent.role;
    }
  });

  console.log(`Filtered ${filteredParentsByRole.length} users for role: ${userRole}`);

  const loadParents = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && now - lastFetchRef.current < 10000) { // Cache for 10 seconds
      return;
    }

    setIsLoading(true);
    setLoadingProgress('Loading parents data...');
    
    try {
      const startTime = performance.now();
      
      console.log(`Loading parents data for userRole: ${userRole}`);
      
      // Use optimized query
      const data = await getParentsWithStudentsOptimized(includeDeleted);
      
      const loadTime = performance.now() - startTime;
      
      console.log(`Loaded ${data.length} total parents/users from database`);
      
      setParents(data);
      setLoadingProgress(`Loaded ${data.length} parents`);
      lastFetchRef.current = now;
      
      if (loadTime > 2000) {
        toast({
          title: "Performance Notice",
          description: `Parents loaded in ${(loadTime / 1000).toFixed(1)}s. Data has been optimized.`,
        });
      }
    } catch (error) {
      console.error('Failed to load parents:', error);
      setLoadingProgress('Failed to load parents');
      toast({
        title: "Error",
        description: "Failed to load parents data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, userRole, includeDeleted]);

  const loadStudents = useCallback(async () => {
    try {
      setLoadingProgress('Loading students data...');
      const studentsData = await getAllStudents(includeDeleted);
      setAllStudents(studentsData);
      setLoadingProgress(`Loaded ${studentsData.length} students`);
    } catch (error) {
      console.error('Failed to load students:', error);
      setLoadingProgress('Failed to load students');
      toast({
        title: "Error",
        description: "Failed to load students data",
        variant: "destructive",
      });
    }
  }, [toast, includeDeleted]);

  // Only run the effect once on mount
  useEffect(() => {
    if (isInitializedRef.current) {
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadParents(true), loadStudents()]);
      setIsLoading(false);
      setLoadingProgress('Data loaded successfully');
      isInitializedRef.current = true;
    };
    
    loadData();
  }, []); // Empty dependency array to run only once

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
    onParentAdded,
    onParentUpdated,
    onImportCompleted,
    refetch
  };
};
