
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { deleteParent, resetParentPassword } from '@/services/parentService';
import { ParentWithStudents } from '@/types/parent';

interface UseAdminParentsActionsProps {
  userRole?: 'parent' | 'teacher' | 'admin' | 'superadmin';
  setParents: (updateFn: (prev: ParentWithStudents[]) => ParentWithStudents[]) => void;
}

export const useAdminParentsActions = ({ 
  userRole = 'parent', 
  setParents 
}: UseAdminParentsActionsProps) => {
  const { toast } = useToast();
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{
    isOpen: boolean;
    email: string;
    name: string;
  }>({ isOpen: false, email: '', name: '' });
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleDeleteParent = async (parentId: string): Promise<void> => {
    const userTypeLabel = userRole === 'superadmin' ? 'superadmin' :
                         userRole === 'teacher' ? 'teacher' : 
                         userRole === 'admin' ? 'admin' : 'parent';
    if (!confirm(`Are you sure you want to delete this ${userTypeLabel}? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteParent(parentId);
      setParents(prev => prev.filter(parent => parent.id !== parentId));
      toast({
        title: "Success",
        description: `${userTypeLabel.charAt(0).toUpperCase() + userTypeLabel.slice(1)} has been deleted`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete ${userTypeLabel}`,
        variant: "destructive",
      });
    }
  };

  const getHeaderTitle = () => {
    switch (userRole) {
      case 'superadmin':
        return 'Superadmins Management';
      case 'teacher':
        return 'Teachers Management';
      case 'admin':
        return 'Admins Management';
      default:
        return 'Parents Management';
    }
  };

  const getHeaderDescription = () => {
    switch (userRole) {
      case 'superadmin':
        return 'Manage superadmin accounts and permissions';
      case 'teacher':
        return 'Manage teacher accounts and permissions';
      case 'admin':
        return 'Manage admin accounts and permissions';
      default:
        return 'Manage parent accounts and student relationships';
    }
  };

  const handleResetParentPassword = (email: string, name: string): void => {
    setResetPasswordDialog({ isOpen: true, email, name });
  };

  const confirmResetPassword = async (): Promise<void> => {
    setIsResettingPassword(true);
    try {
      await resetParentPassword(resetPasswordDialog.email);
      toast({
        title: "Success",
        description: `${resetPasswordDialog.name}'s password has been reset. They can now set up their password again.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to reset password for ${resetPasswordDialog.name}`,
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const closeResetPasswordDialog = () => {
    setResetPasswordDialog({ isOpen: false, email: '', name: '' });
  };

  const getUserTypeLabel = () => {
    return userRole === 'superadmin' ? 'superadmin' :
           userRole === 'teacher' ? 'teacher' : 
           userRole === 'admin' ? 'admin' : 'parent';
  };

  return {
    handleDeleteParent,
    handleResetParentPassword,
    confirmResetPassword,
    closeResetPasswordDialog,
    resetPasswordDialog,
    isResettingPassword,
    getUserTypeLabel,
    getHeaderTitle,
    getHeaderDescription,
  };
};
