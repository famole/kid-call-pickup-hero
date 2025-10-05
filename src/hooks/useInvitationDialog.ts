import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { createPickupInvitation, sendInvitationEmail } from '@/services/pickupInvitationService';
import { getStudentsForParent } from '@/services/studentService';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentParentIdCached } from '@/services/parent/getCurrentParentId';
import { Child } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { logger } from '@/utils/logger';

interface InvitationFormData {
  invitedName: string;
  invitedEmail: string;
  invitedRole: 'family' | 'other';
  studentIds: string[];
  startDate: string;
  endDate: string;
}

export const useInvitationDialog = (isOpen: boolean, onInvitationSent: () => void, onOpenChange: (open: boolean) => void) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<InvitationFormData>({
    invitedName: '',
    invitedEmail: '',
    invitedRole: 'family',
    studentIds: [],
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
      // Get current parent ID (cached)
      const currentParentId = await getCurrentParentIdCached();
      if (!currentParentId) {
        logger.error('Error getting current parent ID via cached helper');
        return;
      }

      // Load user's children
      const userChildren = await getStudentsForParent(currentParentId);
      setChildren(userChildren);
    } catch (error) {
      logger.error('Error loading data:', error);
      toast({
        title: t('common.error'),
        description: t('pickupAuthorizations.loadDataError'),
        variant: "destructive",
      });
    }
  };

  const updateFormData = (field: keyof InvitationFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.invitedName || !formData.invitedEmail || !formData.startDate || !formData.endDate) {
      toast({
        title: t('common.error'),
        description: t('pickupAuthorizations.fillAllFields'),
        variant: "destructive",
      });
      return;
    }

    if (formData.studentIds.length === 0) {
      toast({
        title: t('common.error'),
        description: t('pickupAuthorizations.selectAtLeastOneChild'),
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
      // Create the invitation
      const invitation = await createPickupInvitation(formData);
      
      // Send the email
      await sendInvitationEmail(invitation.id);
      
      const selectedChildren = children.filter(c => formData.studentIds.includes(c.id));
      const childrenNames = selectedChildren.map(c => c.name).join(', ');
      
      toast({
        title: t('common.success'),
        description: t('pickupAuthorizations.invitationSent')
          .replace('{invitedName}', formData.invitedName)
          .replace('{children}', childrenNames),
      });
      
      onInvitationSent();
      onOpenChange(false);
      setFormData({
        invitedName: '',
        invitedEmail: '',
        invitedRole: 'family',
        studentIds: [],
        startDate: '',
        endDate: '',
      });
    } catch (error) {
      logger.error('Error creating invitation:', error);
      toast({
        title: t('common.error'),
        description: t('pickupAuthorizations.failedToSendInvitation'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    children,
    loading,
    formData,
    updateFormData,
    handleSubmit,
  };
};