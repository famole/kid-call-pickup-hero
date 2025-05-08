
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Class } from '@/types';

interface ClassFilterProps {
  selectedClass: string;
  classes: Class[];
  onChange: (value: string) => void;
}

const ClassFilter: React.FC<ClassFilterProps> = ({ selectedClass, classes, onChange }) => {
  return (
    <div className="w-[200px]">
      <Select value={selectedClass} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Filter by class" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Classes</SelectItem>
          {classes.map((cls) => (
            <SelectItem key={cls.id} value={cls.id}>
              {cls.name} ({cls.grade})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ClassFilter;
