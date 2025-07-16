
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import {
  updatePickupAuthorization,
  getParentsWhoShareStudents,
  PickupAuthorizationWithDetails
} from '@/services/pickupAuthorizationService';
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
    studentId: '',
    authorizedParentId: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (authorization) {
        setFormData({
          studentId: authorization.studentId,
          authorizedParentId: authorization.authorizedParentId,
          startDate: authorization.startDate,
          endDate: authorization.endDate
        });
      }
    }
  }, [isOpen, authorization]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: currentParentId, error: parentError } = await supabase.rpc('get_current_parent_id');
      if (parentError || !currentParentId) {
        console.error('Error getting current parent ID:', parentError);
        return;
      }

      const userChildren = await getStudentsForParent(currentParentId);
      setChildren(userChildren);

      const allParentsData = await getAllParents();
      const filteredParents = allParentsData.filter(p => p.id !== currentParentId);
      const formattedAllParents = filteredParents.map(parent => ({
        ...parent,
        students: [],
        sharedStudentIds: [],
        sharedStudentNames: []
      }));

      const { parents: sharedParents, sharedStudents } = await getParentsWhoShareStudents();
      const enhancedSharedParents = sharedParents.map(parent => {
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

      setAllParents(formattedAllParents);
      setParentsWhoShareStudents(enhancedSharedParents);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: t('common.error'),
        description: t('pickupAuthorizations.loadDataError'),
        variant: 'destructive'
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
    if (!authorization) return;

    if (!formData.studentId || !formData.authorizedParentId || !formData.startDate || !formData.endDate) {
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
      await updatePickupAuthorization(authorization.id, {
        studentId: formData.studentId,
        authorizedParentId: formData.authorizedParentId,
        startDate: formData.startDate,
        endDate: formData.endDate
      });

      toast({
        title: t('common.success'),
        description: t('pickupAuthorizations.authorizationUpdated')
      });

      onAuthorizationUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating authorization:', error);
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
