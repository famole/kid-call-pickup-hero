
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Class } from '@/types';

interface ParentClassFilterProps {
  classes: Class[];
  selectedClassId: string;
  onClassChange: (classId: string) => void;
  isLoading?: boolean;
}

const ParentClassFilter: React.FC<ParentClassFilterProps> = ({
  classes,
  selectedClassId,
  onClassChange,
  isLoading = false,
}) => {
  return (
    <div className="w-full max-w-xs">
      <Select value={selectedClassId} onValueChange={onClassChange} disabled={isLoading}>
        <SelectTrigger>
          <SelectValue placeholder="Filter by class" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Classes</SelectItem>
          {classes.map((cls) => (
            <SelectItem key={cls.id} value={cls.id}>
              {cls.name} - {cls.grade}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ParentClassFilter;
