
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { FileUp } from "lucide-react";

interface ImportParentsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => Promise<void>;
}

const ImportParentsDialog: React.FC<ImportParentsDialogProps> = ({
  isOpen,
  onOpenChange,
  onFileChange,
  onSubmit,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100">
          <FileUp className="mr-2 h-4 w-4" /> Import
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Parents</DialogTitle>
          <DialogDescription>
            Upload a CSV file with parent data. The file should have columns for name, email, and phone (optional).
          </DialogDescription>
        </DialogHeader>
        <Input type="file" accept=".csv" onChange={onFileChange} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} className="bg-school-primary">Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportParentsDialog;
