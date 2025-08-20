import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTranslation } from '@/hooks/useTranslation';

interface DeletedItemsFilterProps {
  value: 'active' | 'deleted' | 'all';
  onValueChange: (value: 'active' | 'deleted' | 'all') => void;
  itemType: 'parents' | 'teachers' | 'students' | 'admins' | 'superadmins';
}

const DeletedItemsFilter: React.FC<DeletedItemsFilterProps> = ({
  value,
  onValueChange,
  itemType,
}) => {
  const { t } = useTranslation();
  
  const getLabel = () => {
    switch (itemType) {
      case 'parents':
        return t('deletedItemsFilter.parentStatus');
      case 'teachers':
        return t('deletedItemsFilter.teacherStatus');
      case 'students':
        return t('deletedItemsFilter.studentStatus');
      case 'admins':
        return t('deletedItemsFilter.adminStatus');
      case 'superadmins':
        return t('deletedItemsFilter.superadminStatus');
      default:
        return t('deletedItemsFilter.status');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="status-filter" className="text-sm font-medium">
        {getLabel()}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id="status-filter" className="w-[180px]">
          <SelectValue placeholder={t('deletedItemsFilter.selectStatus')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">{t('deletedItemsFilter.activeOnly')}</SelectItem>
          <SelectItem value="deleted">{t('deletedItemsFilter.deletedOnly')}</SelectItem>
          <SelectItem value="all">{t('deletedItemsFilter.all')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default DeletedItemsFilter;