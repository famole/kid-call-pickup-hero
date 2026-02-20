
import React from 'react';
import { Button } from "@/components/ui/button";
import { Users, Upload, Download, Plus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ImportParentsDialog from './ImportParentsDialog';
import FullImportDialog from '@/components/admin-imports/FullImportDialog';
import { useTranslation } from '@/hooks/useTranslation';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();

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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 text-left min-w-0">
          <Users className="h-6 w-6 sm:h-8 sm:w-8 text-school-primary flex-shrink-0" />
          <h1 className="text-lg sm:text-3xl font-bold text-left truncate">{headerTitle || getDefaultTitle()}</h1>
        </div>
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-1">
            {onExportCSV && (
              <Tooltip>
                <TooltipTrigger asChild>
                  {isMobile ? (
                    <Button onClick={onExportCSV} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Download className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button onClick={onExportCSV} variant="outline" size="sm">
                      <Download className="mr-1.5 h-3.5 w-3.5" /> {t('admin.exportCSV')}
                    </Button>
                  )}
                </TooltipTrigger>
                {isMobile && <TooltipContent>{t('admin.exportCSV')}</TooltipContent>}
              </Tooltip>
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
            <Tooltip>
              <TooltipTrigger asChild>
                {isMobile ? (
                  <Button onClick={onAddParent} size="icon" className="h-8 w-8 bg-school-primary">
                    <Plus className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={onAddParent} size="sm" className="bg-school-primary ml-1">
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> {getButtonLabel()}
                  </Button>
                )}
              </TooltipTrigger>
              {isMobile && <TooltipContent>{getButtonLabel()}</TooltipContent>}
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </header>
  );
};

export default ParentsHeader;
