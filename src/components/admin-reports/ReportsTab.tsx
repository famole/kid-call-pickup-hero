import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { getAllStudents } from '@/services/student';
import { getAllClasses } from '@/services/classService';
import { getPickupHistoryByStudent, getPickupStatsByStudent, getAllPickupHistory, getRecentPickupHistory, getPickupHistoryCount } from '@/services/pickupHistoryService';
import MobilePickupHistoryTable from './MobilePickupHistoryTable';
import ReportFilters from './ReportFilters';
import ReportActions from './ReportActions';
import StudentStats from './StudentStats';
import TableSkeleton from '@/components/ui/skeletons/TableSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { Child, Class } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

const ReportsTab = () => {
  const { t } = useTranslation();
  const [students, setStudents] = useState<Child[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [pickupHistory, setPickupHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [stats, setStats] = useState<{ totalPickups: number; averageDuration: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 500;
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setStudentsLoading(true);
        const [studentsData, classesData] = await Promise.all([
          getAllStudents(),
          getAllClasses()
        ]);
        setStudents(studentsData);
        setClasses(classesData);
      } catch (error) {
        logger.error('Error fetching data:', error);
        toast({
          title: t('reports.error'),
          description: t('reports.failedToLoadData'),
          variant: "destructive",
        });
      } finally {
        setStudentsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleGenerateReport = async (page: number = 1) => {
    setLoading(true);
    try {
      let historyData;
      let selfCheckoutData: any[] = [];
      let count = 0;
      const offset = (page - 1) * pageSize;
      
      if (selectedStudent === 'all') {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;
        
        // Get count first for pagination
        count = await getPickupHistoryCount(undefined, start, end);
        
        // If no date range specified and it's the first page, use recent history for faster loading
        if (!start && !end && page === 1) {
          historyData = await getRecentPickupHistory(pageSize);
        } else {
          historyData = await getAllPickupHistory(start, end, pageSize, offset);
        }

        // Fetch self-checkout data
        let selfCheckoutQuery = supabase
          .from('student_departures')
          .select(`
            id,
            student_id,
            departed_at,
            marked_by_user_id,
            notes,
            students (
              name,
              class_id,
              classes (
                name
              )
            )
          `)
          .order('departed_at', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (start) {
          selfCheckoutQuery = selfCheckoutQuery.gte('departed_at', start.toISOString());
        }
        if (end) {
          const endOfDay = new Date(end);
          endOfDay.setHours(23, 59, 59, 999);
          selfCheckoutQuery = selfCheckoutQuery.lte('departed_at', endOfDay.toISOString());
        }

        const { data: selfCheckoutResult, error: selfCheckoutError } = await selfCheckoutQuery;
        if (selfCheckoutError) {
          console.error('Error fetching self-checkout data:', selfCheckoutError);
        } else {
          selfCheckoutData = selfCheckoutResult || [];
        }

        setStats(null); // Clear individual student stats
      } else {
        count = await getPickupHistoryCount(selectedStudent);
        historyData = await getPickupHistoryByStudent(selectedStudent, pageSize, offset);
        const studentStats = await getPickupStatsByStudent(selectedStudent);
        setStats(studentStats);

        // Fetch self-checkout data for specific student
        const { data: selfCheckoutResult, error: selfCheckoutError } = await supabase
          .from('student_departures')
          .select(`
            id,
            student_id,
            departed_at,
            marked_by_user_id,
            notes,
            students (
              name,
              class_id,
              classes (
                name
              )
            )
          `)
          .eq('student_id', selectedStudent)
          .order('departed_at', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (selfCheckoutError) {
          console.error('Error fetching self-checkout data:', selfCheckoutError);
        } else {
          selfCheckoutData = selfCheckoutResult || [];
        }
      }

      // Get unique teacher IDs from self-checkout data
      const uniqueTeacherIds = [...new Set(selfCheckoutData.map(record => record.marked_by_user_id))];
      
      // Fetch teacher names
      let teacherMap = new Map();
      if (uniqueTeacherIds.length > 0) {
        const { secureOperations } = await import('@/services/encryption');
        const { data: teachers } = await secureOperations.getParentsByIdsSecure(uniqueTeacherIds);
        
        teachers?.forEach(teacher => {
          teacherMap.set(teacher.id, teacher.name);
        });
      }

      // Convert pickup history to include type
      const pickupRecords = historyData.map((item: any) => ({
        ...item,
        type: 'pickup' as const
      }));

      // Convert self-checkout to unified format
      const selfCheckoutRecords = selfCheckoutData.map((item: any) => ({
        id: item.id,
        studentId: item.student_id,
        parentId: item.marked_by_user_id,
        requestTime: new Date(item.departed_at),
        calledTime: null,
        completedTime: new Date(item.departed_at),
        pickupDurationMinutes: null,
        studentName: item.students?.name || 'Unknown Student',
        parentName: teacherMap.get(item.marked_by_user_id) || 'Unknown Teacher',
        className: item.students?.classes?.name || 'N/A',
        createdAt: new Date(item.departed_at),
        type: 'self_checkout' as const
      }));

      // Merge and sort by completedTime
      const allRecords = [...pickupRecords, ...selfCheckoutRecords].sort((a, b) => 
        new Date(b.completedTime).getTime() - new Date(a.completedTime).getTime()
      );

      setPickupHistory(allRecords);
      setTotalCount(count + selfCheckoutData.length);
      setCurrentPage(page);
      
      toast({
        title: t('reports.success'),
        description: t('reports.reportGenerated', { 
          count: allRecords.length, 
          total: count + selfCheckoutData.length
        }),
      });
    } catch (error) {
      logger.error('Error generating report:', error);
      toast({
        title: t('reports.error'),
        description: t('reports.failedToGenerate'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    handleGenerateReport(page);
  };

  const handleExportCSV = () => {
    if (pickupHistory.length === 0) {
      toast({
        title: t('reports.noData'),
        description: t('reports.generateReportFirst'),
        variant: "destructive",
      });
      return;
    }

    const headers = [t('reports.studentName'), t('reports.parentName'), t('reports.requestTime'), t('reports.calledTime'), t('reports.completedTime')];
    const csvContent = [
      headers.join(','),
      ...pickupHistory.map(record => [
        record.studentName || 'Unknown Student',
        record.parentName || 'Unknown Parent',
        record.requestTime.toISOString(),
        record.calledTime ? record.calledTime.toISOString() : '',
        record.completedTime.toISOString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pickup-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: t('reports.success'),
      description: t('reports.reportExported'),
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t('reports.title')}
          </CardTitle>
          <CardDescription>
            {t('reports.pickupHistory')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {studentsLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Filters and Actions Row */}
              <div className="w-full flex flex-col lg:flex-row gap-4 items-stretch">
                <div className="flex-1">
                  <ReportFilters
                    students={students}
                    selectedStudent={selectedStudent}
                    onStudentChange={setSelectedStudent}
                    startDate={startDate}
                    onStartDateChange={setStartDate}
                    endDate={endDate}
                    onEndDateChange={setEndDate}
                    classes={classes}
                    selectedClassId={selectedClassId}
                    onClassChange={setSelectedClassId}
                  />
                </div>
                <div className="flex-shrink-0 flex items-end">
                  <ReportActions
                    onGenerateReport={() => handleGenerateReport(1)}
                    onExportCSV={handleExportCSV}
                    loading={loading}
                    hasData={pickupHistory.length > 0}
                  />
                </div>
              </div>

              <StudentStats stats={stats} />
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={6} columns={5} />
          </CardContent>
        </Card>
      ) : pickupHistory.length > 0 ? (
        <MobilePickupHistoryTable 
          data={pickupHistory} 
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      ) : null}
    </div>
  );
};

export default ReportsTab;
