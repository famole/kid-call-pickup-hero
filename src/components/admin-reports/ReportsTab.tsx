
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
          description: t('reports.failedToLoad'),
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
        setStats(null); // Clear individual student stats
      } else {
        count = await getPickupHistoryCount(selectedStudent);
        historyData = await getPickupHistoryByStudent(selectedStudent, pageSize, offset);
        const studentStats = await getPickupStatsByStudent(selectedStudent);
        setStats(studentStats);
      }

      setPickupHistory(historyData);
      setTotalCount(count);
      setCurrentPage(page);
      
      toast({
        title: t('reports.success'),
        description: t('reports.reportGenerated', { 
          count: historyData.length, 
          total: count 
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
        description: t('reports.pleaseGenerateFirst'),
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
              <div className="flex flex-col lg:flex-row gap-4 items-end">
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
                <div className="flex-shrink-0">
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
