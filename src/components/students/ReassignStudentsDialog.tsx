import React, { useState, useEffect, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Child, Class } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/hooks/use-toast';
import { reassignStudentsToClass } from '@/services/student/reassignStudents';

interface ReassignStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classList: Class[];
  studentList: Child[];
  onCompleted: () => void;
}

const ReassignStudentsDialog: React.FC<ReassignStudentsDialogProps> = ({
  open,
  onOpenChange,
  classList,
  studentList,
  onCompleted,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [sourceClassId, setSourceClassId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const activeStudentsInSource = useMemo(
    () => studentList.filter(
      (s) => s.classId === sourceClassId && (s.status || 'active') === 'active'
    ),
    [studentList, sourceClassId]
  );

  // Select all students when source class changes
  useEffect(() => {
    setSelectedStudentIds(new Set(activeStudentsInSource.map(s => s.id)));
    setTargetClassId('');
  }, [activeStudentsInSource]);

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedStudentIds.size === activeStudentsInSource.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(activeStudentsInSource.map(s => s.id)));
    }
  };

  const handleReassign = async () => {
    if (selectedStudentIds.size === 0 || !targetClassId) return;
    setIsProcessing(true);
    try {
      const count = await reassignStudentsToClass(
        Array.from(selectedStudentIds),
        targetClassId
      );
      toast({
        title: t('admin.reassignSuccess'),
        description: t('admin.reassignedCount', { count }),
      });
      setSourceClassId('');
      setTargetClassId('');
      setSelectedStudentIds(new Set());
      onCompleted();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reassign students",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const allSelected = activeStudentsInSource.length > 0 && selectedStudentIds.size === activeStudentsInSource.length;
  const someSelected = selectedStudentIds.size > 0 && selectedStudentIds.size < activeStudentsInSource.length;

  const targetClassName = classList.find(c => c.id === targetClassId)?.name;
  const sourceClassName = classList.find(c => c.id === sourceClassId)?.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            {t('admin.reassignStudents')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.reassignStudentsDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Source class */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('admin.sourceClass')}</label>
            <Select value={sourceClassId} onValueChange={setSourceClassId}>
              <SelectTrigger>
                <SelectValue placeholder={t('admin.selectSourceClass')} />
              </SelectTrigger>
              <SelectContent>
                {classList.filter(c => c.id && c.id.trim() !== '').map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Student list */}
          {sourceClassId && activeStudentsInSource.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t('admin.studentsToMove')}</label>
                <span className="text-xs text-muted-foreground">
                  {selectedStudentIds.size}/{activeStudentsInSource.length}
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
                  {activeStudentsInSource.map((student) => (
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
            </div>
          )}

          {sourceClassId && activeStudentsInSource.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t('admin.noActiveStudentsInClass')}
            </p>
          )}

          {/* Target class */}
          {sourceClassId && selectedStudentIds.size > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">{t('admin.targetClass')}</label>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <Select value={targetClassId} onValueChange={setTargetClassId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.selectTargetClass')} />
                </SelectTrigger>
                <SelectContent>
                  {classList
                    .filter(c => c.id && c.id.trim() !== '' && c.id !== sourceClassId)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Summary */}
          {sourceClassId && targetClassId && selectedStudentIds.size > 0 && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <span className="font-medium">{selectedStudentIds.size}</span>{' '}
              {t('admin.studentsWillBeMoved')}{' '}
              <Badge variant="outline">{sourceClassName}</Badge>{' '}
              <ArrowRight className="inline h-3 w-3 mx-1" />{' '}
              <Badge variant="outline">{targetClassName}</Badge>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleReassign}
            disabled={selectedStudentIds.size === 0 || !targetClassId || isProcessing}
            className="bg-school-primary"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('admin.reassigning')}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('admin.moveStudents', { count: selectedStudentIds.size })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReassignStudentsDialog;
