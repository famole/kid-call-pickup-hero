
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import {
  updatePickupAuthorization,
  getAvailableParentsForAuthorization,
  PickupAuthorizationWithDetails
} from '@/services/pickupAuthorizationService';
import { getStudentsForParent } from '@/services/studentService';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentParentIdCached } from '@/services/parent/getCurrentParentId';
import { Child } from '@/types';
import { ParentWithStudents } from '@/types/parent';
import { useAuth } from '@/context/AuthContext';
import { logger } from '@/utils/logger';

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

export const useEditAuthorizationDialog = (
  authorization: PickupAuthorizationWithDetails | null,
  isOpen: boolean,
  onAuthorizationUpdated: () => void,
  onOpenChange: (open: boolean) => void
) => {
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
    allowedDaysOfWeek: [1, 2, 3, 4, 5] // Default to weekdays
  });

  useEffect(() => {
    if (isOpen && authorization) {
      loadData();
      
      // Properly handle student IDs - use studentIds array if available, otherwise create array from studentId
      const studentIdArray = authorization.studentIds && authorization.studentIds.length > 0 
        ? authorization.studentIds 
        : (authorization.studentId ? [authorization.studentId] : []);
      
      logger.info('Setting form data with studentIds:', studentIdArray);
      
      setFormData({
        studentIds: studentIdArray,
        authorizedParentId: authorization.authorizedParentId,
        startDate: authorization.startDate,
        endDate: authorization.endDate,
        allowedDaysOfWeek: authorization.allowedDaysOfWeek || [1, 2, 3, 4, 5]
      });
    }
  }, [isOpen, authorization]);

  const loadData = async () => {
    if (!user) return;

    try {
      const currentParentId = await getCurrentParentIdCached();
      if (!currentParentId) {
        logger.error('Error getting current parent ID via cached helper');
        return;
      }

      const userChildren = await getStudentsForParent(currentParentId);
      setChildren(userChildren);

      // Load only available parents (family/other + shared students parents)      
      const { parents: availableParents, sharedStudents } = await getAvailableParentsForAuthorization(currentParentId);
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
          sharedStudentNames
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
        variant: 'destructive'
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
    if (!authorization) return;

    if (formData.studentIds.length === 0 || !formData.authorizedParentId || !formData.startDate || !formData.endDate || formData.allowedDaysOfWeek.length === 0) {
      toast({
        title: t('common.error'),
        description: t('pickupAuthorizations.fillAllFields'),
        variant: 'destructive'
      });
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast({
        title: t('common.error'),
        description: t('pickupAuthorizations.startDateBeforeEndDate'),
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const currentParentId = await getCurrentParentIdCached();
      if (!currentParentId) return;
      
      await updatePickupAuthorization(currentParentId, authorization.id, {
        studentIds: formData.studentIds,
        authorizedParentId: formData.authorizedParentId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        allowedDaysOfWeek: formData.allowedDaysOfWeek
      });

      toast({
        title: t('common.success'),
        description: t('pickupAuthorizations.authorizationUpdated')
      });

      onAuthorizationUpdated();
      onOpenChange(false);
    } catch (error) {
      logger.error('Error updating authorization:', error);
      toast({
        title: t('common.error'),
        description: t('pickupAuthorizations.failedToUpdate'),
        variant: 'destructive'
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
    handleSubmit
  };
};
