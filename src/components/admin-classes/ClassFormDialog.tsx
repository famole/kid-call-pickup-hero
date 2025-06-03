
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Class } from '@/types';

interface ClassFormDialogProps {
  isOpen: boolean;
  isEditMode: boolean;
  classData: Partial<Class>;
  onClose: () => void;
  onSave: () => void;
  onClassDataChange: (data: Partial<Class>) => void;
}

const ClassFormDialog: React.FC<ClassFormDialogProps> = ({
  isOpen,
  isEditMode,
  classData,
  onClose,
  onSave,
  onClassDataChange
}) => {
  const handleInputChange = (field: keyof Class, value: string) => {
    onClassDataChange({ ...classData, [field]: value });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Class' : 'Add New Class'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update class information' : 'Create a new class for your school'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="className">Class Name</Label>
            <Input 
              id="className" 
              value={classData.name || ''} 
              onChange={e => handleInputChange('name', e.target.value)}
              placeholder="e.g. Class 1A"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="grade">Grade</Label>
            <Input 
              id="grade" 
              value={classData.grade || ''}
              onChange={e => handleInputChange('grade', e.target.value)}
              placeholder="e.g. 1st Grade"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="teacher">Teacher</Label>
            <Input 
              id="teacher" 
              value={classData.teacher || ''}
              onChange={e => handleInputChange('teacher', e.target.value)}
              placeholder="e.g. Ms. Smith"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave}>{isEditMode ? 'Update Class' : 'Save Class'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClassFormDialog;
