
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
import { Checkbox } from "@/components/ui/checkbox";
import { Class } from '@/types';
import { ParentWithStudents } from '@/types/parent';
import { getParentsWithStudents } from '@/services/parentService';
import { useTranslation } from '@/hooks/useTranslation';
import { logger } from '@/utils/logger';

interface ClassFormDialogProps {
  isOpen: boolean;
  isEditMode: boolean;
  classData: Partial<Class & { selectedTeachers?: string[] }>;
  onClose: () => void;
  onSave: () => void;
  onClassDataChange: (data: Partial<Class & { selectedTeachers?: string[] }>) => void;
}

const ClassFormDialog: React.FC<ClassFormDialogProps> = ({
  isOpen,
  isEditMode,
  classData,
  onClose,
  onSave,
  onClassDataChange
}) => {
  const { t } = useTranslation();
  const [teachers, setTeachers] = useState<ParentWithStudents[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
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
          logger.error('Failed to load teachers:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadTeachers();
  }, [isOpen]);

  // Reset selected teachers when dialog opens/closes or classData changes
  useEffect(() => {
    if (isOpen && isEditMode && classData.teacher) {
      // For backward compatibility, set the primary teacher if editing existing class
      const primaryTeacher = teachers.find(t => t.name === classData.teacher);
      if (primaryTeacher) {
        setSelectedTeachers([primaryTeacher.id]);
      }
    } else {
      setSelectedTeachers([]);
    }
  }, [isOpen, isEditMode, classData.teacher, teachers]);

  const handleInputChange = (field: keyof Class, value: string) => {
    onClassDataChange({ ...classData, [field]: value });
  };

  const handleTeacherToggle = (teacherId: string, checked: boolean) => {
    if (checked) {
      setSelectedTeachers(prev => [...prev, teacherId]);
    } else {
      setSelectedTeachers(prev => prev.filter(id => id !== teacherId));
    }
  };

  const handleSave = () => {
    // Update the primary teacher field for backward compatibility
    if (selectedTeachers.length > 0) {
      const primaryTeacher = teachers.find(t => t.id === selectedTeachers[0]);
      if (primaryTeacher) {
        onClassDataChange({ 
          ...classData, 
          teacher: primaryTeacher.name,
          selectedTeachers 
        });
      }
    }
    onSave();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t('classes.editClass') : t('classes.addNewClass')}</DialogTitle>
          <DialogDescription>
            {isEditMode ? t('classes.updateClassInfo') : t('classes.createNewClass')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="className">{t('classes.className')}</Label>
            <Input 
              id="className" 
              value={classData.name || ''} 
              onChange={e => handleInputChange('name', e.target.value)}
              placeholder={t('classes.classNamePlaceholder')}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="grade">{t('classes.grade')}</Label>
            <Input 
              id="grade" 
              value={classData.grade || ''}
              onChange={e => handleInputChange('grade', e.target.value)}
              placeholder={t('classes.gradePlaceholder')}
            />
          </div>
          
          <div className="grid gap-2">
            <Label>{t('classes.assignTeachers')}</Label>
            {loading ? (
              <div className="text-sm text-muted-foreground">{t('classes.loadingTeachers')}</div>
            ) : teachers.length === 0 ? (
              <div className="text-sm text-muted-foreground">{t('classes.noTeachersAvailable')}</div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-3">
                {teachers.map((teacher) => (
                  <div key={teacher.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={teacher.id}
                      checked={selectedTeachers.includes(teacher.id)}
                      onCheckedChange={(checked) => handleTeacherToggle(teacher.id, checked as boolean)}
                    />
                    <Label htmlFor={teacher.id} className="text-sm font-normal">
                      {teacher.name} ({teacher.email})
                    </Label>
                  </div>
                ))}
              </div>
            )}
            {selectedTeachers.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedTeachers.length} {t('classes.teachersSelected')}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('classes.cancel')}</Button>
          <Button 
            onClick={handleSave}
            disabled={!classData.name || !classData.grade || selectedTeachers.length === 0}
          >
            {isEditMode ? t('classes.updateClass') : t('classes.saveClass')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClassFormDialog;
