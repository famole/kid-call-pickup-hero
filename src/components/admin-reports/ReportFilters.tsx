
import React, { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { Child, Class } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

interface ReportFiltersProps {
  students: Child[];
  selectedStudent: string;
  onStudentChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  classes: Class[];
  selectedClassId: string;
  onClassChange: (value: string) => void;
}

const ReportFilters: React.FC<ReportFiltersProps> = ({
  students,
  selectedStudent,
  onStudentChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  classes,
  selectedClassId,
  onClassChange
}) => {
  const { t } = useTranslation();
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // Filter students by class and search term
  const filteredStudents = useMemo(() => {
    let filtered = students;

    // Filter by class if selected
    if (selectedClassId !== 'all') {
      filtered = filtered.filter(student => student.classId === selectedClassId);
    }

    // Filter by search term
    if (studentSearchTerm.trim()) {
      filtered = filtered.filter(student => 
        student.name.toLowerCase().includes(studentSearchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [students, selectedClassId, studentSearchTerm]);

  const handleStudentSelect = (studentId: string) => {
    onStudentChange(studentId);
    // Find and set the search term to the selected student's name for display
    if (studentId !== 'all') {
      const student = students.find(s => s.id === studentId);
      if (student) {
        setStudentSearchTerm(student.name);
      }
    } else {
      setStudentSearchTerm('');
    }
  };

  const handleSearchChange = (value: string) => {
    setStudentSearchTerm(value);
    
    // If search is cleared or matches a student exactly, select that student
    if (!value.trim()) {
      onStudentChange('all');
      return;
    }
    
    const exactMatch = filteredStudents.find(student => 
      student.name.toLowerCase() === value.toLowerCase()
    );
    
    if (exactMatch) {
      onStudentChange(exactMatch.id);
    } else {
      // Reset to "all" if no exact match and not currently showing filtered results
      if (selectedStudent !== 'all') {
        onStudentChange('all');
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Class Filter */}
      <div>
        <Label htmlFor="class-select">{t('reports.filters.class')}</Label>
        <Select value={selectedClassId} onValueChange={onClassChange}>
          <SelectTrigger>
            <SelectValue placeholder={t('reports.filters.filterByClass')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('reports.filters.allClasses')}</SelectItem>
            {classes.filter(cls => cls.id && cls.id.trim() !== '').map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name} - {cls.grade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Student Search */}
      <div>
        <Label htmlFor="student-search">{t('reports.filters.student')}</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            id="student-search"
            type="text"
            placeholder={t('reports.filters.searchStudents')}
            value={studentSearchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
          {/* Dropdown for filtered students */}
          {studentSearchTerm && filteredStudents.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-background border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
              <div 
                className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                onClick={() => handleStudentSelect('all')}
              >
                {t('reports.filters.allStudents')}
              </div>
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                  onClick={() => handleStudentSelect(student.id)}
                >
                  {student.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Start Date */}
      <div>
        <Label htmlFor="start-date">{t('reports.filters.startDate')}</Label>
        <Input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          disabled={selectedStudent !== 'all'}
        />
      </div>

      {/* End Date */}
      <div>
        <Label htmlFor="end-date">{t('reports.filters.endDate')}</Label>
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
