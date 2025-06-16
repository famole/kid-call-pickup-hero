
import React from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import ImportParentsDialog from './ImportParentsDialog';

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
  const getButtonLabel = () => {
    switch (userRole) {
      case 'superadmin':
        return 'Add Superadmin';
      case 'teacher':
        return 'Add Teacher';
      case 'admin':
        return 'Add Admin';
      default:
        return 'Add Parent';
    }
  };

  const defaultTitle = userRole === 'superadmin' ? 'Superadmins Management' :
                     userRole === 'teacher' ? 'Teachers Management' : 
                     userRole === 'admin' ? 'Admins Management' : 
                     'Parents Management';

  const defaultDescription = userRole === 'superadmin' ? 'Manage superadmin accounts and permissions' :
                           userRole === 'teacher' ? 'Manage teacher accounts and permissions' :
                           userRole === 'admin' ? 'Manage admin accounts and permissions' :
                           'Manage parent accounts and student relationships';

  return (
    <div className="flex flex-row items-center justify-between">
      <div>
        <h3 className="text-2xl font-semibold leading-none tracking-tight">
          {headerTitle || defaultTitle}
        </h3>
        <p className="text-sm text-muted-foreground">
          {headerDescription || defaultDescription}
        </p>
      </div>
      <div className="flex space-x-2">
        {userRole === 'parent' && (
          <ImportParentsDialog
            isOpen={isImportDialogOpen}
            onOpenChange={openState => openState ? onOpenImportDialog() : onCloseImportDialog()}
            onFileChange={onImportFileChange}
            onSubmit={onImportSubmit}
          />
        )}
        <Button onClick={onAddParent} className="bg-school-primary">
          <PlusCircle className="mr-2 h-4 w-4" /> {getButtonLabel()}
        </Button>
      </div>
    </div>
  );
};

export default ParentsHeader;
