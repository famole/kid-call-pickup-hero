
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!student) {
      return;
    }

    try {
      setLoading(true);
      await markStudentDeparture(student.studentId, notes || undefined);
      
      toast({
        title: "Success",
        description: `${student.student?.name} has been marked as departed.`,
      });
      
      onDepartureMarked();
      onOpenChange(false);
      setNotes('');
    } catch (error) {
      console.error('Error marking departure:', error);
      toast({
        title: "Error",
        description: "Failed to mark student departure.",
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
          <DialogTitle>Mark Student Departure</DialogTitle>
          <DialogDescription>
            Confirm that <strong>{student.student?.name}</strong> is leaving the school.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes about the departure..."
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
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-school-primary hover:bg-school-primary/90"
            >
              {loading ? "Marking Departure..." : "Mark Departure"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MarkDepartureDialog;
