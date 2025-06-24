
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
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
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: "Error",
        description: "Start date must be before end date.",
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
        title: "Success",
        description: "Authorization updated successfully.",
      });
      
      onAuthorizationUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating authorization:', error);
      toast({
        title: "Error",
        description: "Failed to update authorization.",
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
          <DialogTitle>Edit Self-Checkout Authorization</DialogTitle>
          <DialogDescription>
            Update the authorization for {authorization.student?.name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date *</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date *</Label>
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
            <Label htmlFor="isActive">Authorization is active</Label>
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
              disabled={loading || !startDate || !endDate}
              className="bg-school-primary hover:bg-school-primary/90"
            >
              {loading ? "Updating..." : "Update Authorization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditSelfCheckoutAuthorizationDialog;
