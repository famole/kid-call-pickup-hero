
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Class } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

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
  const { t } = useTranslation();
  
  return (
    <div className="w-full max-w-xs">
      <Select value={selectedClassId} onValueChange={onClassChange} disabled={isLoading}>
        <SelectTrigger>
          <SelectValue placeholder={t('parentClassFilter.filterByClass')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('parentClassFilter.allClasses')}</SelectItem>
          {classes.filter(cls => cls.id && cls.id.trim() !== '').map((cls) => (
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
