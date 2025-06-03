
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { createPickupAuthorization } from '@/services/pickupAuthorizationService';
import { getStudentsForParent } from '@/services/studentService';
import { getParentsWithStudents } from '@/services/parentService';
import { Child } from '@/types';
import { ParentWithStudents } from '@/types/parent';
import { useAuth } from '@/context/AuthContext';

interface AddAuthorizationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthorizationAdded: () => void;
}

const AddAuthorizationDialog: React.FC<AddAuthorizationDialogProps> = ({
  isOpen,
  onOpenChange,
  onAuthorizationAdded,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [children, setChildren] = useState<Child[]>([]);
  const [allParents, setAllParents] = useState<ParentWithStudents[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    authorizedParentId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      // Set default dates (today and one week from today)
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        startDate: today,
        endDate: nextWeek,
      }));
    }
  }, [isOpen]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Load user's children
      const userChildren = await getStudentsForParent(user.id);
      setChildren(userChildren);

      // Load all parents (excluding current user)
      const parents = await getParentsWithStudents();
      const otherParents = parents.filter(parent => parent.email !== user.email);
      setAllParents(otherParents);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data for authorization form.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.studentId || !formData.authorizedParentId || !formData.startDate || !formData.endDate) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast({
        title: "Error",
        description: "Start date must be before or equal to end date.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await createPickupAuthorization(formData);
      toast({
        title: "Success",
        description: "Pickup authorization created successfully.",
      });
      onAuthorizationAdded();
      onOpenChange(false);
      setFormData({
        studentId: '',
        authorizedParentId: '',
        startDate: '',
        endDate: '',
      });
    } catch (error) {
      console.error('Error creating authorization:', error);
      toast({
        title: "Error",
        description: "Failed to create pickup authorization.",
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
          <DialogTitle>Add Pickup Authorization</DialogTitle>
          <DialogDescription>
            Allow another parent to pick up your child within a specific date range.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student">Child</Label>
            <Select
              value={formData.studentId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, studentId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent">Authorized Parent</Label>
            <Select
              value={formData.authorizedParentId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, authorizedParentId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a parent" />
              </SelectTrigger>
              <SelectContent>
                {allParents.map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.name} ({parent.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                min={formData.startDate || new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Authorization"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAuthorizationDialog;
