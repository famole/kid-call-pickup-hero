import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  itemName?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  confirmText?: string;
}
const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  itemName,
  isLoading = false,
  onConfirm,
  confirmText
}) => {
  const {
    t
  } = useTranslation();
  return <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>{description}</p>
            {itemName && <p className="font-medium text-foreground">
                {t('common.item')}: <span className="text-primary">{itemName}</span>
              </p>}
            
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isLoading ? <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.deleting')}
              </> : confirmText || t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>;
};
export default DeleteConfirmationDialog;