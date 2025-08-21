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
import { useTranslation } from '@/hooks/useTranslation';

interface InvitationFormData {
  invitedName: string;
  invitedEmail: string;
  invitedRole: 'family' | 'other';
  studentIds: string[];
  startDate: string;
  endDate: string;
}

interface InvitationFormProps {
  children: Child[];
  formData: InvitationFormData;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onUpdateFormData: (field: keyof InvitationFormData, value: any) => void;
  onCancel: () => void;
}

const InvitationForm: React.FC<InvitationFormProps> = ({
  children,
  formData,
  loading,
  onSubmit,
  onUpdateFormData,
  onCancel,
}) => {
  const { t } = useTranslation();

  const handleStudentToggle = (studentId: string) => {
    const currentIds = formData.studentIds || [];
    const newIds = currentIds.includes(studentId)
      ? currentIds.filter(id => id !== studentId)
      : [...currentIds, studentId];
    onUpdateFormData('studentIds', newIds);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="invitedName">{t('pickupAuthorizations.invitedName')}</Label>
        <Input
          id="invitedName"
          type="text"
          placeholder={t('pickupAuthorizations.invitedNamePlaceholder')}
          value={formData.invitedName}
          onChange={(e) => onUpdateFormData('invitedName', e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="invitedEmail">{t('pickupAuthorizations.invitedEmail')}</Label>
        <Input
          id="invitedEmail"
          type="email"
          placeholder={t('pickupAuthorizations.invitedEmailPlaceholder')}
          value={formData.invitedEmail}
          onChange={(e) => onUpdateFormData('invitedEmail', e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="invitedRole">{t('pickupAuthorizations.relationship')}</Label>
        <Select
          value={formData.invitedRole}
          onValueChange={(value: 'family' | 'other') => onUpdateFormData('invitedRole', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('pickupAuthorizations.selectRelationship')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="family">{t('pickupAuthorizations.family')}</SelectItem>
            <SelectItem value="other">{t('pickupAuthorizations.other')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('pickupAuthorizations.selectChildren')}</Label>
        <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-3">
          {children.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('pickupAuthorizations.noChildrenAvailable')}
            </p>
          ) : (
            children.map((child) => (
              <div key={child.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`child-${child.id}`}
                  checked={formData.studentIds?.includes(child.id) || false}
                  onChange={() => handleStudentToggle(child.id)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor={`child-${child.id}`} className="cursor-pointer">
                  {child.name}
                </Label>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">{t('pickupAuthorizations.startDate')}</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => onUpdateFormData('startDate', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            required
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
            required
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading 
            ? t('pickupAuthorizations.sendingInvitation') 
            : t('pickupAuthorizations.sendInvitation')
          }
        </Button>
      </div>
    </form>
  );
};

export default InvitationForm;