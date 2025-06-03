
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Child } from '@/types';
import { ParentWithStudents } from '@/types/parent';
import ParentSelector from './ParentSelector';

interface FormData {
  studentId: string;
  authorizedParentId: string;
  startDate: string;
  endDate: string;
}

interface AddAuthorizationFormProps {
  children: Child[];
  allParents: ParentWithStudents[];
  formData: FormData;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onUpdateFormData: (field: keyof FormData, value: string) => void;
  onCancel: () => void;
}

const AddAuthorizationForm: React.FC<AddAuthorizationFormProps> = ({
  children,
  allParents,
  formData,
  loading,
  onSubmit,
  onUpdateFormData,
  onCancel,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="student">Child</Label>
        <Select
          value={formData.studentId}
          onValueChange={(value) => onUpdateFormData('studentId', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a child" />
          </SelectTrigger>
          <SelectContent>
            {children.map((child) => (
              <SelectItem key={child.id} value={child.id}>
                {child.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="parent">Authorized Parent</Label>
        <ParentSelector
          parents={allParents}
          value={formData.authorizedParentId}
          onValueChange={(value) => onUpdateFormData('authorizedParentId', value)}
          placeholder="Search and select a parent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => onUpdateFormData('startDate', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => onUpdateFormData('endDate', e.target.value)}
            min={formData.startDate || new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Authorization"}
        </Button>
      </div>
    </form>
  );
};

export default AddAuthorizationForm;
