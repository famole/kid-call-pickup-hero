import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserMinus, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Class, Child } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

interface WithdrawStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classList: Class[];
  studentList: Child[];
  onWithdraw: (studentIds: string[]) => Promise<void>;
  isLoading: boolean;
}

const WithdrawStudentsDialog: React.FC<WithdrawStudentsDialogProps> = ({
  open,
  onOpenChange,
  classList,
  studentList,
  onWithdraw,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const activeStudentsInClass = useMemo(
    () => studentList.filter(
      (s) => s.classId === selectedClassId && (s.status || 'active') === 'active'
    ),
    [studentList, selectedClassId]
  );

  useEffect(() => {
    setSelectedStudentIds(new Set());
  }, [selectedClassId]);

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedStudentIds.size === activeStudentsInClass.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(activeStudentsInClass.map(s => s.id)));
    }
  };

  const handleWithdraw = async () => {
    if (selectedStudentIds.size === 0) return;
    await onWithdraw(Array.from(selectedStudentIds));
    setSelectedClassId('');
    setSelectedStudentIds(new Set());
    onOpenChange(false);
  };

  const allSelected = activeStudentsInClass.length > 0 && selectedStudentIds.size === activeStudentsInClass.length;
  const someSelected = selectedStudentIds.size > 0 && selectedStudentIds.size < activeStudentsInClass.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5" />
            {t('admin.withdrawStudents')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.withdrawStudentsDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger>
              <SelectValue placeholder={t('admin.selectClass')} />
            </SelectTrigger>
            <SelectContent>
              {classList.filter(c => c.id && c.id.trim() !== '').map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedClassId && activeStudentsInClass.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('admin.studentsToWithdraw')}</Label>
                <span className="text-xs text-muted-foreground">
                  {selectedStudentIds.size}/{activeStudentsInClass.length}
                </span>
              </div>

              <div className="border rounded-md">
                <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/50">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) (el as any).indeterminate = someSelected;
                    }}
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-sm font-medium">{t('admin.selectAll')}</span>
                </div>
                <ScrollArea className="max-h-48">
                  {activeStudentsInClass.map((student) => (
                    <label
                      key={student.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedStudentIds.has(student.id)}
                        onCheckedChange={() => toggleStudent(student.id)}
                      />
                      <span className="text-sm">{student.name}</span>
                    </label>
                  ))}
                </ScrollArea>
              </div>

              <p className="text-xs text-destructive">
                {t('admin.withdrawWarning')}
              </p>
            </div>
          )}

          {selectedClassId && activeStudentsInClass.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t('admin.noActiveStudentsInClass')}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('admin.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleWithdraw}
            disabled={selectedStudentIds.size === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('admin.withdrawing')}
              </>
            ) : (
              <>
                <UserMinus className="mr-2 h-4 w-4" />
                {t('admin.withdrawSelected', { count: selectedStudentIds.size })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawStudentsDialog;
