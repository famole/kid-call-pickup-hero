
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { getAllStudents } from '@/services/student';
import { getPickupHistoryByStudent, getPickupStatsByStudent, getAllPickupHistory } from '@/services/pickupHistoryService';
import PickupHistoryTable from './PickupHistoryTable';
import ReportFilters from './ReportFilters';
import ReportActions from './ReportActions';
import StudentStats from './StudentStats';
import TableSkeleton from '@/components/ui/skeletons/TableSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { Child } from '@/types';
import { useToast } from '@/hooks/use-toast';

const ReportsTab = () => {
  const [students, setStudents] = useState<Child[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [pickupHistory, setPickupHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [stats, setStats] = useState<{ totalPickups: number; averageDuration: number } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setStudentsLoading(true);
        const studentsData = await getAllStudents();
        setStudents(studentsData);
      } catch (error) {
        console.error('Error fetching students:', error);
        toast({
          title: "Error",
          description: "Failed to load students",
          variant: "destructive",
        });
      } finally {
        setStudentsLoading(false);
      }
    };

    fetchStudents();
  }, [toast]);

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      let historyData;
      
      if (selectedStudent === 'all') {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;
        historyData = await getAllPickupHistory(start, end);
        setStats(null); // Clear individual student stats
      } else {
        historyData = await getPickupHistoryByStudent(selectedStudent);
        const studentStats = await getPickupStatsByStudent(selectedStudent);
        setStats(studentStats);
      }

      setPickupHistory(historyData);
      
      toast({
        title: "Success",
        description: `Generated report with ${historyData.length} pickup records`,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (pickupHistory.length === 0) {
      toast({
        title: "No Data",
        description: "Please generate a report first",
        variant: "destructive",
      });
      return;
    }

    const headers = ['Student Name', 'Parent Name', 'Request Time', 'Called Time', 'Completed Time'];
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
      title: "Success",
      description: "Report exported successfully",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Pickup History Reports
          </CardTitle>
          <CardDescription>
            Generate and export historical pickup data for analysis
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
            <>
              <ReportFilters
                students={students}
                selectedStudent={selectedStudent}
                onStudentChange={setSelectedStudent}
                startDate={startDate}
                onStartDateChange={setStartDate}
                endDate={endDate}
                onEndDateChange={setEndDate}
              />

              <ReportActions
                onGenerateReport={handleGenerateReport}
                onExportCSV={handleExportCSV}
                loading={loading}
                hasData={pickupHistory.length > 0}
              />

              <StudentStats stats={stats} />
            </>
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
        <PickupHistoryTable data={pickupHistory} />
      ) : null}
    </div>
  );
};

export default ReportsTab;
