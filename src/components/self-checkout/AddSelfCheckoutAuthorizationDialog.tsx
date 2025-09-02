
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { logger } from '@/utils/logger';
import { createSelfCheckoutAuthorization } from '@/services/selfCheckoutService';
import { supabase } from '@/integrations/supabase/client';
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
  const { t } = useTranslation();

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
      
      // Get current user
      const { data: currentUser, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser.user) {
        throw new Error('User not authenticated');
      }

      // Get parent ID
      const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .select('id')
        .eq('email', currentUser.user.email)
        .single();

      if (parentError || !parentData) {
        throw new Error('Parent not found');
      }

      // Get students for this parent
      const { data: studentParents, error: studentParentsError } = await supabase
        .from('student_parents')
        .select('student_id')
        .eq('parent_id', parentData.id);

      if (studentParentsError) {
        throw new Error(studentParentsError.message);
      }

      if (!studentParents || studentParents.length === 0) {
        setStudents([]);
        return;
      }

      const studentIds = studentParents.map(sp => sp.student_id);

      // Get student details
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .in('id', studentIds);

      if (studentsError) {
        throw new Error(studentsError.message);
      }

      const formattedStudents: Child[] = studentsData.map(student => ({
        id: student.id,
        name: student.name,
        classId: student.class_id || '',
        parentIds: [],
        avatar: student.avatar
      }));

      setStudents(formattedStudents);
    } catch (error) {
      logger.error('Error loading students:', error);
      toast({
        title: t('common.error'),
        description: t('selfCheckout.loadDataError'),
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
        title: t('common.error'),
        description: t('selfCheckout.fillAllFields'),
        variant: "destructive",
      });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: t('common.error'),
        description: t('selfCheckout.startDateBeforeEndDate'),
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await createSelfCheckoutAuthorization(selectedStudentId, startDate, endDate);
      
      toast({
        title: t('common.success'),
        description: t('selfCheckout.authorizationCreated'),
      });
      
      onAuthorizationAdded();
      onOpenChange(false);
      
      // Reset form
      setSelectedStudentId('');
      setStartDate('');
      setEndDate('');
    } catch (error) {
      logger.error('Error creating authorization:', error);
      toast({
        title: t('common.error'),
        description: t('selfCheckout.failedToCreate'),
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
          <DialogTitle>{t('selfCheckout.addAuthorization')}</DialogTitle>
          <DialogDescription>
            {t('selfCheckout.description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student">{t('selfCheckout.student')} *</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId} disabled={studentsLoading}>
              <SelectTrigger>
                <SelectValue placeholder={studentsLoading ? t('common.loading') : t('selfCheckout.selectChild')} />
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
            <Label htmlFor="startDate">{t('selfCheckout.startDate')} *</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">{t('selfCheckout.endDate')} *</Label>
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
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedStudentId || !startDate || !endDate}
              className="bg-school-primary hover:bg-school-primary/90"
            >
              {loading ? t('selfCheckout.creating') : t('selfCheckout.createAuthorization')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddSelfCheckoutAuthorizationDialog;
