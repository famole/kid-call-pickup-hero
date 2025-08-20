
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Child } from '@/types';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface DeleteStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Child | null;
  onDelete: () => void;
  isLoading?: boolean; // Add isLoading prop
}

const DeleteStudentDialog = ({
  open,
  onOpenChange,
  student,
  onDelete,
  isLoading = false
}: DeleteStudentDialogProps) => {
  const { t } = useTranslation();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('admin.deleteStudent')}</DialogTitle>
          <DialogDescription>
            {t('admin.deleteStudentConfirm', { studentName: student?.name })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isLoading}
          >
            {t('admin.cancel')}
          </Button>
          <Button 
            variant="destructive" 
            onClick={onDelete} 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('admin.deleting')}
              </>
            ) : (
              t('admin.delete')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteStudentDialog;

