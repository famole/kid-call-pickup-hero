
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
import { Class } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

interface DeleteClassDialogProps {
  isOpen: boolean;
  classToDelete: Class | null;
  onClose: () => void;
  onConfirmDelete: () => void;
}

const DeleteClassDialog: React.FC<DeleteClassDialogProps> = ({
  isOpen,
  classToDelete,
  onClose,
  onConfirmDelete
}) => {
  const { t } = useTranslation();
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('classes.deleteClass')}</DialogTitle>
          <DialogDescription>
            {t('classes.confirmDelete', { className: classToDelete?.name })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('classes.cancel')}</Button>
          <Button variant="destructive" onClick={onConfirmDelete}>{t('classes.delete')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteClassDialog;
