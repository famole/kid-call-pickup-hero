import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap } from 'lucide-react';
import { Class, Child } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

interface GraduateStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classList: Class[];
  studentList: Child[];
  onGraduate: (classId: string, graduationYear: number) => Promise<void>;
  isLoading: boolean;
}

const GraduateStudentsDialog: React.FC<GraduateStudentsDialogProps> = ({
  open,
  onOpenChange,
  classList,
  studentList,
  onGraduate,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [graduationYear, setGraduationYear] = useState(new Date().getFullYear().toString());

  const activeStudentsInClass = studentList.filter(
    (s) => s.classId === selectedClassId && (s.status || 'active') === 'active'
  );

  const handleGraduate = async () => {
    if (!selectedClassId || !graduationYear) return;
    await onGraduate(selectedClassId, parseInt(graduationYear));
    setSelectedClassId('');
    setGraduationYear(new Date().getFullYear().toString());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {t('admin.graduateStudents')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.graduateStudentsDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger>
              <SelectValue placeholder={t('admin.selectClassToGraduate')} />
            </SelectTrigger>
            <SelectContent>
              {classList.filter(c => c.id && c.id.trim() !== '').map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="space-y-2">
            <Label>{t('admin.graduationYear')}</Label>
            <Input
              type="number"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
              min={2000}
              max={2100}
            />
          </div>

          {selectedClassId && (
            <p className="text-sm text-muted-foreground">
              {t('admin.graduateCount', { count: activeStudentsInClass.length })}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('admin.cancel')}
          </Button>
          <Button
            onClick={handleGraduate}
            disabled={!selectedClassId || activeStudentsInClass.length === 0 || isLoading}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <GraduationCap className="mr-2 h-4 w-4" />
            {isLoading ? t('admin.graduating') : t('admin.graduateClass')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GraduateStudentsDialog;
