
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { Class } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

interface StudentSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedClassId: string;
  onClassFilterChange: (value: string) => void;
  classList: Class[];
}

const StudentSearch: React.FC<StudentSearchProps> = ({
  searchTerm,
  onSearchChange,
  selectedClassId,
  onClassFilterChange,
  classList
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start text-left">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder={t('admin.searchStudents')}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 text-left"
        />
      </div>
      <div className="sm:w-48">
        <Select value={selectedClassId} onValueChange={onClassFilterChange}>
          <SelectTrigger className="text-left">
            <SelectValue placeholder={t('admin.filterByClass')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.allClasses')}</SelectItem>
            {classList.filter(classItem => classItem.id && classItem.id.trim() !== '').map((classItem) => (
              <SelectItem key={classItem.id} value={classItem.id}>
                {classItem.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default StudentSearch;
