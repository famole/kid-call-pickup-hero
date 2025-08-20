import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from '@/hooks/useTranslation';

interface ResetPasswordConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  parentName: string;
  userTypeLabel: string;
  isLoading?: boolean;
}

const ResetPasswordConfirmDialog: React.FC<ResetPasswordConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  parentName,
  userTypeLabel,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('resetPasswordDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            <div dangerouslySetInnerHTML={{ 
              __html: t('resetPasswordDialog.description', { parentName }) 
            }} />
            <br /><br />
            {t('resetPasswordDialog.thisWill')}
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>{t('resetPasswordDialog.removeAccount')}</li>
              <li>{t('resetPasswordDialog.setStatusNotConfigured')}</li>
              <li>{t('resetPasswordDialog.allowSetupAgain')}</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {t('resetPasswordDialog.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? t('resetPasswordDialog.resetting') : t('resetPasswordDialog.reset')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ResetPasswordConfirmDialog;