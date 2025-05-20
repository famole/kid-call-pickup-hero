
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Child } from '@/types';

interface AddStudentToParentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  selectedParentName: string | undefined;
  allStudents: Child[];
  selectedStudentId: string;
  onSelectedStudentIdChange: (id: string) => void;
  relationship: string;
  onRelationshipChange: (relationship: string) => void;
  isPrimary: boolean;
  onIsPrimaryChange: (isPrimary: boolean) => void;
  onSubmit: () => Promise<void>;
}

const AddStudentToParentDialog: React.FC<AddStudentToParentDialogProps> = ({
  isOpen,
  onOpenChange,
  selectedParentName,
  allStudents,
  selectedStudentId,
  onSelectedStudentIdChange,
  relationship,
  onRelationshipChange,
  isPrimary,
  onIsPrimaryChange,
  onSubmit,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Student to Parent</DialogTitle>
          <DialogDescription>
            Associate a student with {selectedParentName || 'the selected parent'}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="student">Student</Label>
            <select 
              id="student" 
              className="w-full border rounded p-2 bg-background text-foreground" // Added bg and text for dark mode
              value={selectedStudentId}
              onChange={(e) => onSelectedStudentIdChange(e.target.value)}
              required
            >
              <option value="">Select a student</option>
              {allStudents.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="relationship">Relationship (optional)</Label>
            <Input 
              id="relationship" 
              placeholder="e.g., Mother, Father, Guardian" 
              value={relationship}
              onChange={(e) => onRelationshipChange(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="primary" 
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" // Basic styling
              checked={isPrimary}
              onChange={(e) => onIsPrimaryChange(e.target.checked)}
            />
            <Label htmlFor="primary">Primary Parent/Guardian</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit}>Add Student</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentToParentDialog;
