
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createPickupAuthorization, getParentsWhoShareStudents } from '@/services/pickupAuthorizationService';
import { getStudentsForParent } from '@/services/studentService';
import { getAllParents } from '@/services/parentService';
import { supabase } from '@/integrations/supabase/client';
import { Child } from '@/types';
import { ParentWithStudents } from '@/types/parent';
import { useAuth } from '@/context/AuthContext';

interface FormData {
  studentId: string;
  authorizedParentId: string;
  startDate: string;
  endDate: string;
}

interface ParentWithSharedStudents extends ParentWithStudents {
  sharedStudentIds?: string[];
  sharedStudentNames?: string[];
}

export const useAddAuthorizationDialog = (isOpen: boolean, onAuthorizationAdded: () => void, onOpenChange: (open: boolean) => void) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [children, setChildren] = useState<Child[]>([]);
  const [allParents, setAllParents] = useState<ParentWithSharedStudents[]>([]);
  const [parentsWhoShareStudents, setParentsWhoShareStudents] = useState<ParentWithSharedStudents[]>([]);
  const [showOnlySharedParents, setShowOnlySharedParents] = useState(false); // Changed default to false to show all parents by default
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    studentId: '',
    authorizedParentId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      // Set default dates (today and one week from today)
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        startDate: today,
        endDate: nextWeek,
      }));
    }
  }, [isOpen]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Get current parent ID from the server
      const { data: currentParentId, error: parentError } = await supabase.rpc('get_current_parent_id');

      if (parentError || !currentParentId) {
        console.error('Error getting current parent ID:', parentError);
        return;
      }

      // Load user's children
      const userChildren = await getStudentsForParent(currentParentId);
      setChildren(userChildren);

      // Load ALL parents from the system
      const allParentsData = await getAllParents();
      
      // Filter out the current user from the list of parents
      const filteredParents = allParentsData.filter(parent => parent.id !== currentParentId);
      
      // Convert to the expected format
      const formattedAllParents = filteredParents.map(parent => ({
        ...parent,
        students: [], // We don't need student relationships for all parents
        sharedStudentIds: [],
        sharedStudentNames: [],
      }));

      // Load parents who share students with current user for the filter option
      const { parents: sharedParents, sharedStudents } = await getParentsWhoShareStudents();
      
      // Enhance shared parents data with shared student information
      const enhancedSharedParents = sharedParents.map(parent => {
        const sharedStudentIds = sharedStudents[parent.id] || [];
        const sharedStudentNames = userChildren
          .filter(child => sharedStudentIds.includes(child.id))
          .map(child => child.name);
        
        return {
          ...parent,
          students: parent.students || [],
          sharedStudentIds,
          sharedStudentNames,
        };
      });

      setAllParents(formattedAllParents);
      setParentsWhoShareStudents(enhancedSharedParents);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data for authorization form.",
        variant: "destructive",
      });
    }
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleParentFilter = () => {
    setShowOnlySharedParents(!showOnlySharedParents);
  };

  const getDisplayParents = () => {
    return showOnlySharedParents ? parentsWhoShareStudents : allParents;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.studentId || !formData.authorizedParentId || !formData.startDate || !formData.endDate) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast({
        title: "Error",
        description: "Start date must be before or equal to end date.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await createPickupAuthorization(formData);
      
      const selectedParent = [...allParents, ...parentsWhoShareStudents].find(p => p.id === formData.authorizedParentId);
      const selectedChild = children.find(c => c.id === formData.studentId);
      
      toast({
        title: "Success",
        description: `Pickup authorization created for ${selectedParent?.name} to pick up ${selectedChild?.name}.`,
      });
      
      onAuthorizationAdded();
      onOpenChange(false);
      setFormData({
        studentId: '',
        authorizedParentId: '',
        startDate: '',
        endDate: '',
      });
    } catch (error) {
      console.error('Error creating authorization:', error);
      toast({
        title: "Error",
        description: "Failed to create pickup authorization.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    children,
    allParents: getDisplayParents(),
    parentsWhoShareStudents,
    showOnlySharedParents,
    toggleParentFilter,
    loading,
    formData,
    updateFormData,
    handleSubmit,
  };
};
