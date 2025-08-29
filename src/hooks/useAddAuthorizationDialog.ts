
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { createPickupAuthorization, getParentsWhoShareStudents } from '@/services/pickupAuthorizationService';
import { getStudentsForParent } from '@/services/studentService';
import { getAllParents } from '@/services/parentService';
import { supabase } from '@/integrations/supabase/client';
import { Child } from '@/types';
import { ParentWithStudents } from '@/types/parent';
import { useAuth } from '@/context/AuthContext';

interface FormData {
  studentIds: string[];
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
  const { t } = useTranslation();
  const [children, setChildren] = useState<Child[]>([]);
  const [allParents, setAllParents] = useState<ParentWithSharedStudents[]>([]);
  const [parentsWhoShareStudents, setParentsWhoShareStudents] = useState<ParentWithSharedStudents[]>([]);
  const [showOnlySharedParents, setShowOnlySharedParents] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    studentIds: [],
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

  // Load ALL parents from the system (excluding family and other roles)
  const allParentsData = await getAllParents();
  
  // Filter out the current user and family/other roles from the list of parents
  const filteredParents = allParentsData.filter(parent => 
    parent.id !== currentParentId && 
    parent.role && 
    !['family', 'other'].includes(parent.role)
  );
      
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
        title: t('common.error'),
        description: t('pickupAuthorizations.loadDataError'),
        variant: "destructive",
      });
    }
  };

  const updateFormData = (field: keyof FormData, value: string | string[]) => {
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
    
    if (formData.studentIds.length === 0 || !formData.authorizedParentId || !formData.startDate || !formData.endDate) {
      toast({
        title: t('common.error'),
        description: t('pickupAuthorizations.fillAllFields'),
        variant: "destructive",
      });
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast({
        title: t('common.error'),
        description: t('pickupAuthorizations.startDateBeforeEndDate'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create authorization for each selected student
      for (const studentId of formData.studentIds) {
        await createPickupAuthorization({
          studentId,
          authorizedParentId: formData.authorizedParentId,
          startDate: formData.startDate,
          endDate: formData.endDate
        });
      }
      
      const selectedParent = [...allParents, ...parentsWhoShareStudents].find(p => p.id === formData.authorizedParentId);
      const selectedChildrenNames = children
        .filter(c => formData.studentIds.includes(c.id))
        .map(c => c.name)
        .join(', ');
      
      toast({
        title: t('common.success'),
        description: t('pickupAuthorizations.authorizationCreated')
          .replace('{parentName}', selectedParent?.name || '')
          .replace('{studentName}', selectedChildrenNames),
      });
      
      onAuthorizationAdded();
      onOpenChange(false);
      setFormData({
        studentIds: [],
        authorizedParentId: '',
        startDate: '',
        endDate: '',
      });
    } catch (error) {
      console.error('Error creating authorization:', error);
      toast({
        title: t('common.error'),
        description: t('pickupAuthorizations.failedToCreate'),
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
