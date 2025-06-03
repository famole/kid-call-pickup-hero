
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Child } from '@/types';

interface ReportFiltersProps {
  students: Child[];
  selectedStudent: string;
  onStudentChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
}

const ReportFilters: React.FC<ReportFiltersProps> = ({
  students,
  selectedStudent,
  onStudentChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <Label htmlFor="student-select">Student</Label>
        <Select value={selectedStudent} onValueChange={onStudentChange}>
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
          onChange={(e) => onStartDateChange(e.target.value)}
          disabled={selectedStudent !== 'all'}
        />
      </div>

      <div>
        <Label htmlFor="end-date">End Date (Optional)</Label>
        <Input
          id="end-date"
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          disabled={selectedStudent !== 'all'}
        />
      </div>
    </div>
  );
};

export default ReportFilters;
