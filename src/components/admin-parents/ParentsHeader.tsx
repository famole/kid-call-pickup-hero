
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
}

const ParentsHeader: React.FC<ParentsHeaderProps> = ({
  onAddParent,
  isImportDialogOpen,
  onOpenImportDialog,
  onCloseImportDialog,
  onImportFileChange,
  onImportSubmit,
}) => {
  return (
    <div className="flex flex-row items-center justify-between">
      <div>
        <h3 className="text-2xl font-semibold leading-none tracking-tight">
          Parents Management
        </h3>
        <p className="text-sm text-muted-foreground">
          Manage parents and their associated students
        </p>
      </div>
      <div className="flex space-x-2">
        <ImportParentsDialog
          isOpen={isImportDialogOpen}
          onOpenChange={openState => openState ? onOpenImportDialog() : onCloseImportDialog()}
          onFileChange={onImportFileChange}
          onSubmit={onImportSubmit}
        />
        <Button onClick={onAddParent}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Parent
        </Button>
      </div>
    </div>
  );
};

export default ParentsHeader;
