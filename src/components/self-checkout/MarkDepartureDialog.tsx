
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { logger } from '@/utils/logger';
import { markStudentDeparture, SelfCheckoutAuthorizationWithDetails } from '@/services/selfCheckoutService';

interface MarkDepartureDialogProps {
  student: SelfCheckoutAuthorizationWithDetails | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDepartureMarked: () => void;
}

const MarkDepartureDialog: React.FC<MarkDepartureDialogProps> = ({
  student,
  isOpen,
  onOpenChange,
  onDepartureMarked
}) => {
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!student) {
      return;
    }

    try {
      setLoading(true);
      await markStudentDeparture(student.studentId, notes || undefined);
      
      toast({
        title: t('common.success'),
        description: t('selfCheckout.studentMarkedDeparted', { studentName: student.student?.name }),
      });
      
      onDepartureMarked();
      onOpenChange(false);
      setNotes('');
    } catch (error) {
      logger.error('Error marking departure:', error);
      toast({
        title: t('common.error'),
        description: t('selfCheckout.failedToMarkDeparture'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!student) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('selfCheckout.studentDeparture')}</DialogTitle>
          <DialogDescription>
            {t('selfCheckout.confirmDeparture', { studentName: student.student?.name })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">{t('selfCheckout.notesOptional')}</Label>
            <Textarea
              id="notes"
              placeholder={t('selfCheckout.addNotesAboutDeparture')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
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
              disabled={loading}
              className="bg-school-primary hover:bg-school-primary/90"
            >
              {loading ? t('selfCheckout.markingDeparture') : t('selfCheckout.markDeparture')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MarkDepartureDialog;
