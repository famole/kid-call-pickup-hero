import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Class, Child } from '@/types';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface EditStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classList: Class[];
  student: Partial<Child>;
  setStudent: React.Dispatch<React.SetStateAction<Partial<Child>>>;
  onUpdate: () => void;
  isLoading?: boolean;
}

const EditStudentDialog = ({
  open,
  onOpenChange,
  classList,
  student,
  setStudent,
  onUpdate,
  isLoading = false
}: EditStudentDialogProps) => {
  const { t } = useTranslation();
  const nameId = React.useId();
  const classId = React.useId();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('admin.editStudentTitle')}</DialogTitle>
          <DialogDescription>
            {t('admin.editStudent')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor={nameId} className="required">{t('forms.studentName')}</Label>
            <Input
              id={nameId}
              value={student.name || ''}
              onChange={e => setStudent({...student, name: e.target.value})}
              placeholder="e.g. Jane Doe"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={classId} className="required">{t('admin.class')}</Label>
            <Select
              value={student.classId || ''}
              onValueChange={(value) => setStudent({...student, classId: value})}
              required
            >
              <SelectTrigger id={classId}>
                <SelectValue placeholder={t('admin.selectClass')} />
              </SelectTrigger>
              <SelectContent>
                {classList.map((classItem) => (
                  <SelectItem key={classItem.id} value={classItem.id}>
                    {classItem.name} ({classItem.grade})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {t('admin.cancel')}
          </Button>
          <Button 
            onClick={onUpdate}
            disabled={!student.name || !student.classId || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('admin.updating')}
              </>
            ) : (
              t('admin.updateStudent')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditStudentDialog;
