
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { updateSelfCheckoutAuthorization, SelfCheckoutAuthorizationWithDetails } from '@/services/selfCheckoutService';

interface EditSelfCheckoutAuthorizationDialogProps {
  authorization: SelfCheckoutAuthorizationWithDetails | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthorizationUpdated: () => void;
}

const EditSelfCheckoutAuthorizationDialog: React.FC<EditSelfCheckoutAuthorizationDialogProps> = ({
  authorization,
  isOpen,
  onOpenChange,
  onAuthorizationUpdated
}) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (authorization) {
      setStartDate(authorization.startDate);
      setEndDate(authorization.endDate);
      setIsActive(authorization.isActive);
    }
  }, [authorization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authorization || !startDate || !endDate) {
      toast({
        title: t('common.error'),
        description: t('selfCheckout.fillAllFields'),
        variant: "destructive",
      });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: t('common.error'),
        description: t('selfCheckout.startDateBeforeEndDate'),
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await updateSelfCheckoutAuthorization(authorization.id, {
        startDate,
        endDate,
        isActive
      });
      
      toast({
        title: t('common.success'),
        description: t('selfCheckout.authorizationUpdated'),
      });
      
      onAuthorizationUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating authorization:', error);
      toast({
        title: t('common.error'),
        description: t('selfCheckout.failedToUpdate'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!authorization) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('selfCheckout.editAuthorization')}</DialogTitle>
          <DialogDescription>
            {t('selfCheckout.updateAuthorization')} {authorization.student?.name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">{t('selfCheckout.startDate')} *</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">{t('selfCheckout.endDate')} *</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="isActive">{t('selfCheckout.authorizationIsActive')}</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading || !startDate || !endDate}
              className="bg-school-primary hover:bg-school-primary/90"
            >
              {loading ? t('selfCheckout.updating') : t('selfCheckout.updateAuthorization')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditSelfCheckoutAuthorizationDialog;
