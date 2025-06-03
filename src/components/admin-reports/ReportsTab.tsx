
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Calendar, BarChart3 } from 'lucide-react';
import { getStudents } from '@/services/student';
import { getPickupHistoryByStudent, getPickupStatsByStudent, getAllPickupHistory } from '@/services/pickupHistoryService';
import PickupHistoryTable from './PickupHistoryTable';
import { Student } from '@/types';
import { useToast } from '@/hooks/use-toast';

const ReportsTab = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [pickupHistory, setPickupHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ totalPickups: number; averageDuration: number } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const studentsData = await getStudents();
        setStudents(studentsData);
      } catch (error) {
        console.error('Error fetching students:', error);
        toast({
          title: "Error",
          description: "Failed to load students",
          variant: "destructive",
        });
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

    const headers = ['Student ID', 'Parent ID', 'Request Time', 'Called Time', 'Completed Time', 'Duration (minutes)'];
    const csvContent = [
      headers.join(','),
      ...pickupHistory.map(record => [
        record.studentId,
        record.parentId,
        record.requestTime.toISOString(),
        record.calledTime ? record.calledTime.toISOString() : '',
        record.completedTime.toISOString(),
        record.pickupDurationMinutes || ''
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="student-select">Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start-date">Start Date (Optional)</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={selectedStudent !== 'all'}
              />
            </div>

            <div>
              <Label htmlFor="end-date">End Date (Optional)</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={selectedStudent !== 'all'}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleGenerateReport} disabled={loading}>
              <Calendar className="h-4 w-4 mr-2" />
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportCSV}
              disabled={pickupHistory.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Student Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Pickups</p>
                    <p className="text-2xl font-bold">{stats.totalPickups}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Average Duration</p>
                    <p className="text-2xl font-bold">{stats.averageDuration} min</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {pickupHistory.length > 0 && (
        <PickupHistoryTable data={pickupHistory} />
      )}
    </div>
  );
};

export default ReportsTab;
