import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
  const getLabel = () => {
    switch (itemType) {
      case 'parents':
        return 'Parent Status';
      case 'teachers':
        return 'Teacher Status';
      case 'students':
        return 'Student Status';
      case 'admins':
        return 'Admin Status';
      case 'superadmins':
        return 'Superadmin Status';
      default:
        return 'Status';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="status-filter" className="text-sm font-medium">
        {getLabel()}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id="status-filter" className="w-[180px]">
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active Only</SelectItem>
          <SelectItem value="deleted">Deleted Only</SelectItem>
          <SelectItem value="all">All</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default DeletedItemsFilter;