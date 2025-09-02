
import { useState } from 'react';
import { ParentInput, ParentWithStudents } from '@/types/parent';
import { createParent } from '@/services/parentService';
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/utils/logger";
import { useTranslation } from '@/hooks/useTranslation';
import { validateParentForm, getErrorTypeFromMessage, ValidationError } from '@/utils/parentValidation';

interface UseAddParentFormProps {
  onParentAdded: (newParent: ParentWithStudents) => void;
  defaultRole?: 'parent' | 'teacher' | 'admin' | 'superadmin' | 'family';
}

export const useAddParentForm = ({ onParentAdded, defaultRole = 'parent' }: UseAddParentFormProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<ValidationError[]>([]);
  const [newParent, setNewParent] = useState<ParentInput>({
    name: '',
    email: '',
    phone: '',
    role: defaultRole,
  });

  const openAddParentSheet = () => {
    setNewParent({
      name: '',
      email: '',
      phone: '',
      role: defaultRole,
    });
    setFormErrors([]);
    setIsAddSheetOpen(true);
  };

  const closeAddParentSheet = () => {
    setIsAddSheetOpen(false);
    setFormErrors([]);
  };

  const handleNewParentChange = (parent: ParentInput) => {
    setNewParent(parent);
    // Clear field-specific errors when user starts typing
    if (formErrors.length > 0) {
      setFormErrors(prev => prev.filter(error => {
        if (parent.name !== newParent.name && error.field === 'name') return false;
        if (parent.email !== newParent.email && error.field === 'email') return false;
        if (parent.phone !== newParent.phone && error.field === 'phone') return false;
        if (parent.role !== newParent.role && error.field === 'role') return false;
        return true;
      }));
    }
  };

  const handleAddParentSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Clear previous errors
    setFormErrors([]);

    // Validate form
    const validationErrors = validateParentForm(newParent);
    if (validationErrors.length > 0) {
      setFormErrors(validationErrors);
      // Show toast with first error
      const firstError = validationErrors[0];
      toast({
        title: t('common.error'),
        description: t(firstError.key),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const createdParent = await createParent(newParent);
      const createdParentWithStudents: ParentWithStudents = {
        ...createdParent,
        students: []
      };
      onParentAdded(createdParentWithStudents);
      
      toast({
        title: t('common.success'),
        description: t('addParentSheet.success', { 
          role: newParent.role?.charAt(0).toUpperCase() + newParent.role?.slice(1) || 'User' 
        }),
      });
      closeAddParentSheet();
    } catch (error) {
      logger.error('Error adding parent:', error);
      
      // Determine error type and show appropriate message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorKey = getErrorTypeFromMessage(errorMessage);
      
      toast({
        title: t('common.error'),
        description: t(errorKey),
        variant: "destructive",
      });

      // If it's a duplicate email error, show field-specific error
      if (errorKey === 'addParentSheet.errors.duplicateEmail') {
        setFormErrors([{ field: 'email', key: errorKey }]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldError = (fieldName: string): ValidationError | undefined => {
    return formErrors.find(error => error.field === fieldName);
  };

  const hasFieldError = (fieldName: string): boolean => {
    return formErrors.some(error => error.field === fieldName);
  };

  return {
    isAddSheetOpen,
    newParent,
    isSubmitting,
    formErrors,
    openAddParentSheet,
    closeAddParentSheet,
    handleNewParentChange,
    handleAddParentSubmit,
    getFieldError,
    hasFieldError,
  };
};
