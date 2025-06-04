
import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';
import { getParentsWithStudentsOptimized } from '@/services/parent/optimizedParentOperations';
import { getAllStudents } from '@/services/studentService';

interface UseOptimizedParentsDataProps {
  userRole?: 'parent' | 'teacher' | 'admin';
}

export const useOptimizedParentsData = ({ userRole = 'parent' }: UseOptimizedParentsDataProps) => {
  const { toast } = useToast();
  const [parents, setParents] = useState<ParentWithStudents[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allStudents, setAllStudents] = useState<Child[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<string>('Initializing...');

  // Filter parents by role
  const filteredParentsByRole = parents.filter(parent => 
    parent.role === userRole || (!parent.role && userRole === 'parent')
  );

  const loadParents = useCallback(async () => {
    setIsLoading(true);
    setLoadingProgress('Loading parents data...');
    
    try {
      const startTime = performance.now();
      console.log('Starting parents data load...');
      
      const data = await getParentsWithStudentsOptimized();
      
      const loadTime = performance.now() - startTime;
      console.log(`Parents loaded in ${loadTime.toFixed(2)}ms`);
      
      setParents(data);
      setLoadingProgress(`Loaded ${data.length} parents`);
      
      if (loadTime > 1000) {
        toast({
          title: "Performance Notice",
          description: `Parents loaded in ${(loadTime / 1000).toFixed(1)}s. Consider pagination for better performance.`,
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
  }, [toast]);

  const loadStudents = useCallback(async () => {
    setLoadingProgress('Loading students data...');
    try {
      const studentsData = await getAllStudents();
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
  }, [toast]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadParents(), loadStudents()]);
      setIsLoading(false);
      setLoadingProgress('Data loaded successfully');
    };
    
    loadData();
  }, [loadParents, loadStudents]);

  const onParentAdded = (newParent: ParentWithStudents) => {
    setParents(prev => [...prev, newParent]);
  };

  const onParentUpdated = (updatedParent: ParentWithStudents) => {
    setParents(prev => prev.map(p => p.id === updatedParent.id ? updatedParent : p));
  };

  const onImportCompleted = () => {
    loadParents();
  };

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
  };
};
