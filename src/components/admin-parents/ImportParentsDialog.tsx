
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
import { useTranslation } from '@/hooks/useTranslation';

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
  const { t } = useTranslation();
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100">
          <FileUp className="mr-2 h-4 w-4" /> {t('importParentsDialog.trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('importParentsDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('importParentsDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <Input type="file" accept=".csv" onChange={onFileChange} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('importParentsDialog.cancel')}</Button>
          <Button onClick={onSubmit} className="bg-school-primary">{t('importParentsDialog.import')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportParentsDialog;
