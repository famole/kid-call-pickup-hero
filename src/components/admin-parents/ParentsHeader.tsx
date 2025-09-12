
import React from 'react';
import { Button } from "@/components/ui/button";
import { Users, Upload, Download, Plus } from "lucide-react";
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
  userRole?: 'parent' | 'teacher' | 'admin' | 'superadmin' | 'family';
  headerTitle?: string;
  headerDescription?: string;
  onExportCSV?: () => void;
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
  onExportCSV,
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
      case 'family':
        return t('admin.addFamilyMember');
      default:
        return t('admin.addParent');
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
      case 'family':
        return t('admin.family');
      default:
        return t('admin.parents');
    }
  };

  return (
    <header className="mb-8 text-left">
      <div className="flex flex-col sm:flex-row sm:items-start justify-start gap-4">
        <div className="flex items-center gap-3 text-left">
          <Users className="h-8 w-8 text-school-primary" />
          <h1 className="text-3xl font-bold text-left">{headerTitle || getDefaultTitle()}</h1>
        </div>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          {onExportCSV && (
            <Button onClick={onExportCSV} variant="outline" className="flex-1 sm:flex-none">
              <Download className="mr-2 h-4 w-4" /> {t('admin.exportCSV')}
            </Button>
          )}
          {(userRole === 'parent' || userRole === 'family') && (
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
          <Button 
            onClick={onAddParent} 
            className="bg-school-primary flex-1 sm:flex-none"
          >
            <Plus className="mr-2 h-4 w-4" /> {getButtonLabel()}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default ParentsHeader;
