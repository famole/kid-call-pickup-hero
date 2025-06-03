
import React, { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Class } from '@/types';
import { ParentWithStudents } from '@/types/parent';
import { getParentsWithStudents } from '@/services/parentService';

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
  const [teachers, setTeachers] = useState<ParentWithStudents[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadTeachers = async () => {
      if (isOpen) {
        setLoading(true);
        try {
          const allParents = await getParentsWithStudents();
          const teachersList = allParents.filter(parent => parent.role === 'teacher');
          setTeachers(teachersList);
        } catch (error) {
          console.error('Failed to load teachers:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadTeachers();
  }, [isOpen]);

  const handleInputChange = (field: keyof Class, value: string) => {
    onClassDataChange({ ...classData, [field]: value });
  };

  const handleTeacherChange = (teacherId: string) => {
    const selectedTeacher = teachers.find(teacher => teacher.id === teacherId);
    if (selectedTeacher) {
      handleInputChange('teacher', selectedTeacher.name);
    }
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
            <Select 
              value={teachers.find(t => t.name === classData.teacher)?.id || ''} 
              onValueChange={handleTeacherChange}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Loading teachers..." : "Select a teacher"} />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </SelectItem>
                ))}
                {teachers.length === 0 && !loading && (
                  <SelectItem value="" disabled>
                    No teachers available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
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
