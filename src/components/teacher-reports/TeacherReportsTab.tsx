import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/context/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import MobilePickupHistoryTable from '@/components/admin-reports/MobilePickupHistoryTable';
import TableSkeleton from '@/components/ui/skeletons/TableSkeleton';
import StudentStats from '@/components/admin-reports/StudentStats';
import { format } from 'date-fns';
import { PickupHistoryWithDetails } from '@/services/pickupHistoryService';
import { BarChart3, Download, FileText } from 'lucide-react';

interface PickupHistoryData {
  id: string;
  student_id: string;
  parent_id: string;
  request_time: string;
  called_time: string | null;
  completed_time: string;
  pickup_duration_minutes: number | null;
  students: {
    name: string;
    classes: {
      name: string;
    } | null;
  };
  parents: {
    name: string;
  };
}

interface StudentStatsData {
  totalPickups: number;
  averageDuration: number;
}

const TeacherReportsTab: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [pickupHistory, setPickupHistory] = useState<PickupHistoryData[]>([]);
  const [studentStats, setStudentStats] = useState<StudentStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [teacherClassIds, setTeacherClassIds] = useState<string[]>([]);

  // Get teacher's assigned classes
  const fetchTeacherClasses = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: classAssignments, error } = await supabase
        .from('class_teachers')
        .select('class_id')
        .eq('teacher_id', user.id);

      if (error) throw error;

      const classIds = classAssignments.map(assignment => assignment.class_id);
      setTeacherClassIds(classIds);
    } catch (error) {
      console.error('Error fetching teacher classes:', error);
      toast.error(t('teacherReports.failedToLoadClasses'));
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTeacherClasses();
  }, [fetchTeacherClasses]);

  const handleGenerateReport = async () => {
    if (teacherClassIds.length === 0) {
      toast.error(t('teacherReports.noAssignedClasses'));
      return;
    }

    setLoading(true);

    try {
      const startDate = `${selectedDate} 00:00:00`;
      const endDate = `${selectedDate} 23:59:59`;

      // Fetch pickup history for the selected date and teacher's classes
      const { data: historyData, error: historyError } = await supabase
        .from('pickup_history')
        .select(`
          id,
          student_id,
          parent_id,
          request_time,
          called_time,
          completed_time,
          pickup_duration_minutes,
          students (
            name,
            classes (
              name
            )
          ),
          parents (
            name
          )
        `)
        .gte('completed_time', startDate)
        .lte('completed_time', endDate)
        .in('students.class_id', teacherClassIds)
        .order('completed_time', { ascending: false });

      if (historyError) throw historyError;

      setPickupHistory(historyData || []);

      // Calculate stats for the day
      if (historyData && historyData.length > 0) {
        const totalPickups = historyData.length;
        const validDurations = historyData.filter(item => item.pickup_duration_minutes);
        const avgTime = validDurations.length > 0 
          ? validDurations.reduce((sum, item) => sum + (item.pickup_duration_minutes || 0), 0) / validDurations.length
          : 0;

        setStudentStats({
          totalPickups: totalPickups,
          averageDuration: Math.round(avgTime)
        });
      } else {
        setStudentStats(null);
      }

      toast.success(t('teacherReports.reportGenerated'));
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(t('teacherReports.failedToGenerate'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!pickupHistory.length) {
      toast.error(t('teacherReports.noDataToExport'));
      return;
    }

    try {
      // Prepare CSV data
      const headers = [t('teacherReports.date'), t('teacherReports.time'), t('teacherReports.student'), t('teacherReports.class'), t('teacherReports.parent'), t('teacherReports.duration')];
      const csvData = pickupHistory.map(item => [
        format(new Date(item.completed_time), 'yyyy-MM-dd'),
        format(new Date(item.completed_time), 'HH:mm:ss'),
        item.students?.name || 'N/A',
        item.students?.classes?.name || 'N/A',
        item.parents?.name || 'N/A',
        item.pickup_duration_minutes?.toString() || 'N/A'
      ]);

      // Create CSV content
      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `teacher-pickup-report-${selectedDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(t('teacherReports.reportExported'));
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error(t('teacherReports.failedToExport'));
    }
  };

  // Convert data to match MobilePickupHistoryTable expected format
  const convertToPickupHistoryWithDetails = (data: PickupHistoryData[]): PickupHistoryWithDetails[] => {
    return data.map(item => ({
      id: item.id,
      studentId: item.student_id,
      parentId: item.parent_id,
      requestTime: new Date(item.request_time),
      calledTime: item.called_time ? new Date(item.called_time) : null,
      completedTime: new Date(item.completed_time),
      pickupDurationMinutes: item.pickup_duration_minutes,
      studentName: item.students?.name || 'Unknown Student',
      parentName: item.parents?.name || 'Unknown Parent',
      className: item.students?.classes?.name || 'N/A',
      createdAt: new Date(item.completed_time)
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t('teacherReports.title')}
          </CardTitle>
          <CardDescription>
            {t('teacherReports.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="report-date">{t('teacherReports.selectDate')}</Label>
              <Input
                id="report-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end space-x-2">
              <Button 
                onClick={handleGenerateReport} 
                disabled={loading || teacherClassIds.length === 0}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <FileText className="h-4 w-4 mr-2" />
                {loading ? t('teacherReports.generating') : t('teacherReports.generateReport')}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExportCSV}
                disabled={!pickupHistory.length}
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('admin.exportCSV')}
              </Button>
            </div>
          </div>

          {teacherClassIds.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('teacherReports.noAssignedClasses')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {studentStats && (
        <StudentStats 
          stats={studentStats}
        />
      )}

      {loading ? (
        <TableSkeleton />
      ) : (
        <MobilePickupHistoryTable 
          data={convertToPickupHistoryWithDetails(pickupHistory)}
          currentPage={1}
          totalCount={pickupHistory.length}
          pageSize={500}
          onPageChange={() => {}}
        />
      )}
    </div>
  );
};

export default TeacherReportsTab;