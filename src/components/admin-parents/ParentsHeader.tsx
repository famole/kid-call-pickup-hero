
import React from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import ImportParentsDialog from './ImportParentsDialog';
import FullImportDialog from '@/components/admin-imports/FullImportDialog';
import { useTranslation } from '@/hooks/useTranslation';

interface ParentsHeaderProps {
  onAddParent: () => void;
  isImportDialogOpen: boolean;
  onOpenImportDialog: () => void;
  onCloseImportDialog: () => void;
  onImportFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImportSubmit: () => Promise<void>;
  userRole?: 'parent' | 'teacher' | 'admin' | 'superadmin';
  headerTitle?: string;
  headerDescription?: string;
}

const ParentsHeader: React.FC<ParentsHeaderProps> = ({
  onAddParent,
  isImportDialogOpen,
  onOpenImportDialog,
  onCloseImportDialog,
  onImportFileChange,
  onImportSubmit,
  userRole = 'parent',
  headerTitle,
  headerDescription,
}) => {
  const { t } = useTranslation();

  const getButtonLabel = () => {
    switch (userRole) {
      case 'superadmin':
        return t('parentsManagement.addSuperadmin');
      case 'teacher':
        return t('parentsManagement.addTeacher');
      case 'admin':
        return t('parentsManagement.addAdmin');
      default:
        return t('parentsManagement.addParent');
    }
  };

  const getDefaultTitle = () => {
    switch (userRole) {
      case 'superadmin':
        return t('parentsManagement.superadmins.title');
      case 'teacher':
        return t('parentsManagement.teachers.title');
      case 'admin':
        return t('parentsManagement.admins.title');
      default:
        return t('parentsManagement.title');
    }
  };

  const getDefaultDescription = () => {
    switch (userRole) {
      case 'superadmin':
        return t('parentsManagement.superadmins.description');
      case 'teacher':
        return t('parentsManagement.teachers.description');
      case 'admin':
        return t('parentsManagement.admins.description');
      default:
        return t('parentsManagement.description');
    }
  };

  return (
    <div className="flex flex-row items-center justify-between">
      <div>
        <h3 className="text-2xl font-semibold leading-none tracking-tight">
          {headerTitle || getDefaultTitle()}
        </h3>
        <p className="text-sm text-muted-foreground">
          {headerDescription || getDefaultDescription()}
        </p>
      </div>
      <div className="flex space-x-2">
        {userRole === 'parent' && (
          <>
            <ImportParentsDialog
              isOpen={isImportDialogOpen}
              onOpenChange={openState => openState ? onOpenImportDialog() : onCloseImportDialog()}
              onFileChange={onImportFileChange}
              onSubmit={onImportSubmit}
            />
            <FullImportDialog />
          </>
        )}
        <Button onClick={onAddParent} className="bg-school-primary">
          <PlusCircle className="mr-2 h-4 w-4" /> {getButtonLabel()}
        </Button>
      </div>
    </div>
  );
};

export default ParentsHeader;
