import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/context/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import MobilePickupHistoryTable from '@/components/admin-reports/MobilePickupHistoryTable';
import TableSkeleton from '@/components/ui/skeletons/TableSkeleton';
import StudentStats from '@/components/admin-reports/StudentStats';
import { format, subDays } from 'date-fns';
import { PickupHistoryWithDetails } from '@/services/pickupHistoryService';
import { BarChart3, Download, FileText, Filter } from 'lucide-react';

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

interface TeacherClass {
  class_id: string;
  classes: {
    name: string;
  };
}

const TeacherReportsTab: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Default to yesterday
  const yesterday = subDays(new Date(), 1);
  const [startDate, setStartDate] = useState<string>(format(yesterday, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(yesterday, 'yyyy-MM-dd'));
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  
  const [pickupHistory, setPickupHistory] = useState<PickupHistoryData[]>([]);
  const [studentStats, setStudentStats] = useState<StudentStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);

  // Get teacher's assigned classes
  const fetchTeacherClasses = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: classAssignments, error } = await supabase
        .from('class_teachers')
        .select(`
          class_id,
          classes!class_teachers_class_id_fkey (
            name
          )
        `)
        .eq('teacher_id', user.id);

      if (error) throw error;

      setTeacherClasses(classAssignments || []);
    } catch (error) {
      console.error('Error fetching teacher classes:', error);
      toast.error(t('teacherReports.failedToLoadClasses'));
    }
  }, [user?.id, t]);

  useEffect(() => {
    fetchTeacherClasses();
  }, [fetchTeacherClasses]);

  const handleGenerateReport = async () => {
    if (teacherClasses.length === 0) {
      toast.error(t('teacherReports.noAssignedClasses'));
      return;
    }

    setLoading(true);

    try {
      const startDateTime = `${startDate} 00:00:00`;
      const endDateTime = `${endDate} 23:59:59`;

      // Determine which classes to filter by
      const classIds = selectedClassId === 'all' 
        ? teacherClasses.map(tc => tc.class_id)
        : [selectedClassId];

      // Fetch pickup history for the selected date range and teacher's classes
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
            class_id,
            classes (
              name
            )
          ),
          parents (
            name
          )
        `)
        .gte('completed_time', startDateTime)
        .lte('completed_time', endDateTime)
        .order('completed_time', { ascending: false });

      if (historyError) throw historyError;

      // Filter by selected classes
      let filteredData = historyData || [];
      if (selectedClassId !== 'all') {
        filteredData = filteredData.filter(item => 
          item.students?.class_id === selectedClassId
        );
      } else {
        // Filter by teacher's classes when "all" is selected
        filteredData = filteredData.filter(item => 
          classIds.includes(item.students?.class_id)
        );
      }

      setPickupHistory(filteredData);

      // Calculate stats for the date range
      if (filteredData && filteredData.length > 0) {
        const totalPickups = filteredData.length;
        const validDurations = filteredData.filter(item => item.pickup_duration_minutes);
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
      const dateRange = startDate === endDate ? startDate : `${startDate}_to_${endDate}`;
      link.download = `teacher-pickup-report-${dateRange}.csv`;
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Class Selection */}
            {teacherClasses.length > 1 && (
              <div>
                <Label htmlFor="class-select">{t('teacherReports.selectClass')}</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t('teacherReports.selectClass')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('teacherReports.allClasses')}</SelectItem>
                    {teacherClasses.map((tc) => (
                      <SelectItem key={tc.class_id} value={tc.class_id}>
                        {tc.classes?.name || 'Unknown Class'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Date Range Selection */}
            <div>
              <Label htmlFor="start-date">{t('teacherReports.startDate')}</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="end-date">{t('teacherReports.endDate')}</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            {/* Current Filter Display */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>{t('teacherReports.filteringBy')}:</span>
              {teacherClasses.length > 1 && (
                <span className="font-medium">
                  {selectedClassId === 'all' 
                    ? t('teacherReports.allClasses') 
                    : teacherClasses.find(tc => tc.class_id === selectedClassId)?.classes?.name
                  }
                </span>
              )}
              <span className="font-medium">
                {startDate === endDate ? format(new Date(startDate), 'MMM dd, yyyy') : `${format(new Date(startDate), 'MMM dd')} - ${format(new Date(endDate), 'MMM dd, yyyy')}`}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <Button 
                onClick={handleGenerateReport} 
                disabled={loading || teacherClasses.length === 0}
                className="bg-[hsl(var(--school-primary))] hover:bg-[hsl(var(--school-primary))]/90 text-white"
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

          {teacherClasses.length === 0 && (
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