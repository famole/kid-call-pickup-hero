
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
import SearchOnlyParentSelector from './SearchOnlyParentSelector';
import { useTranslation } from '@/hooks/useTranslation';

interface FormData {
  studentIds: string[];
  authorizedParentId: string;
  startDate: string;
  endDate: string;
}

interface ParentWithSharedStudents {
  id: string;
  name: string;
  email: string;
  sharedStudentNames?: string[];
  students?: any[];
}

interface AddAuthorizationFormProps {
  children: Child[];
  allParents: ParentWithSharedStudents[];
  formData: FormData;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onUpdateFormData: (field: keyof FormData, value: string | string[]) => void;
  onCancel: () => void;
  showOnlySharedParents: boolean;
  onToggleParentFilter: () => void;
  parentsWhoShareStudents: ParentWithSharedStudents[];
  submitLabel?: string;
  loadingLabel?: string;
}

const AddAuthorizationForm: React.FC<AddAuthorizationFormProps> = ({
  children,
  allParents,
  formData,
  loading,
  onSubmit,
  onUpdateFormData,
  onCancel,
  showOnlySharedParents,
  onToggleParentFilter,
  parentsWhoShareStudents,
  submitLabel,
  loadingLabel,
}) => {
  const { t } = useTranslation();

  const defaultSubmitLabel = submitLabel || t('pickupAuthorizations.createAuthorization');
  const defaultLoadingLabel = loadingLabel || t('pickupAuthorizations.creating');

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="students">{t('pickupAuthorizations.children')}</Label>
        <div className="border rounded-md p-2 space-y-2 max-h-40 overflow-y-auto">
          {children.map((child) => (
            <label key={child.id} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.studentIds.includes(child.id)}
                onChange={(e) => {
                  const newStudentIds = e.target.checked
                    ? [...formData.studentIds, child.id]
                    : formData.studentIds.filter(id => id !== child.id);
                  onUpdateFormData('studentIds', newStudentIds);
                }}
                className="rounded"
              />
              <span className="text-sm">{child.name}</span>
            </label>
          ))}
          {children.length === 0 && (
            <p className="text-sm text-gray-500">{t('pickupAuthorizations.noChildrenAvailable')}</p>
          )}
        </div>
      </div>

      <SearchOnlyParentSelector
        parents={allParents}
        value={formData.authorizedParentId}
        onValueChange={(value) => onUpdateFormData('authorizedParentId', value)}
        placeholder={t('pickupAuthorizations.searchForParent')}
        showOnlySharedParents={showOnlySharedParents}
        onToggleFilter={onToggleParentFilter}
        parentsWhoShareStudents={parentsWhoShareStudents}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">{t('pickupAuthorizations.startDate')}</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => onUpdateFormData('startDate', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">{t('pickupAuthorizations.endDate')}</Label>
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
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? defaultLoadingLabel : defaultSubmitLabel}
        </Button>
      </div>
    </form>
  );
};

export default AddAuthorizationForm;
