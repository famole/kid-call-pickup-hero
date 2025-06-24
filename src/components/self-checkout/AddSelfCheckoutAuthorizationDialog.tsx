
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createSelfCheckoutAuthorization } from '@/services/selfCheckoutService';
import { getStudentsForParent } from '@/services/parentService';
import { Child } from '@/types';

interface AddSelfCheckoutAuthorizationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthorizationAdded: () => void;
}

const AddSelfCheckoutAuthorizationDialog: React.FC<AddSelfCheckoutAuthorizationDialogProps> = ({
  isOpen,
  onOpenChange,
  onAuthorizationAdded
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [students, setStudents] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadStudents();
      // Set default dates (today to end of current month)
      const today = new Date();
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(today.toISOString().split('T')[0]);
      setEndDate(endOfMonth.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const loadStudents = async () => {
    try {
      setStudentsLoading(true);
      const studentData = await getStudentsForParent();
      setStudents(studentData);
    } catch (error) {
      console.error('Error loading students:', error);
      toast({
        title: "Error",
        description: "Failed to load your children.",
        variant: "destructive",
      });
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudentId || !startDate || !endDate) {
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
      await createSelfCheckoutAuthorization(selectedStudentId, startDate, endDate);
      
      toast({
        title: "Success",
        description: "Self-checkout authorization created successfully.",
      });
      
      onAuthorizationAdded();
      onOpenChange(false);
      
      // Reset form
      setSelectedStudentId('');
      setStartDate('');
      setEndDate('');
    } catch (error) {
      console.error('Error creating authorization:', error);
      toast({
        title: "Error",
        description: "Failed to create authorization.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Self-Checkout Authorization</DialogTitle>
          <DialogDescription>
            Allow your child to leave school independently during the specified period.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student">Student *</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId} disabled={studentsLoading}>
              <SelectTrigger>
                <SelectValue placeholder={studentsLoading ? "Loading students..." : "Select a student"} />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
              disabled={loading || !selectedStudentId || !startDate || !endDate}
              className="bg-school-primary hover:bg-school-primary/90"
            >
              {loading ? "Creating..." : "Create Authorization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddSelfCheckoutAuthorizationDialog;
