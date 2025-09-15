
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { logger } from '@/utils/logger';
import { createPickupAuthorization, getAvailableParentsForAuthorization } from '@/services/pickupAuthorizationService';
import { getStudentsForParent } from '@/services/studentService';
import { supabase } from '@/integrations/supabase/client';
import { Child } from '@/types';
import { ParentWithStudents } from '@/types/parent';
import { useAuth } from '@/context/AuthContext';

interface FormData {
  studentIds: string[];
  authorizedParentId: string;
  startDate: string;
  endDate: string;
  allowedDaysOfWeek: number[];
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
    allowedDaysOfWeek: [1, 2, 3, 4, 5], // Default to weekdays
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
        logger.error('Error getting current parent ID:', parentError);
        return;
      }

      // Load user's children
      const userChildren = await getStudentsForParent(currentParentId);
      setChildren(userChildren);

      // Load only available parents (family/other + shared students parents)
      const { parents: availableParents, sharedStudents } = await getAvailableParentsForAuthorization();
      
      // Enhance available parents data with shared student information
      const enhancedAvailableParents = availableParents
        .filter(parent => parent && parent.id) // Filter out null parents
        .map(parent => {
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

      // Filter to get parents who actually share students (have shared students)
      const parentsWithSharedStudents = enhancedAvailableParents.filter(parent => 
        parent.sharedStudentIds && parent.sharedStudentIds.length > 0
      );

      setAllParents(enhancedAvailableParents);
      setParentsWhoShareStudents(parentsWithSharedStudents);

    } catch (error) {
      logger.error('Error loading data:', error);
      toast({
        title: t('common.error'),
        description: t('pickupAuthorizations.loadDataError'),
        variant: "destructive",
      });
    }
  };

  const updateFormData = (field: keyof FormData, value: string | string[] | number[]) => {
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
    
    if (formData.studentIds.length === 0 || !formData.authorizedParentId || !formData.startDate || !formData.endDate || formData.allowedDaysOfWeek.length === 0) {
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
          endDate: formData.endDate,
          allowedDaysOfWeek: formData.allowedDaysOfWeek
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
        allowedDaysOfWeek: [1, 2, 3, 4, 5], // Reset to weekdays
      });
    } catch (error) {
      logger.error('Error creating authorization:', error);
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
