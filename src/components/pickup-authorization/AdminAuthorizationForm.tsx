import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { createPickupAuthorization, getAvailableParentsForAuthorization } from '@/services/pickupAuthorizationService';
import SearchOnlyParentSelector from './SearchOnlyParentSelector';
import { ParentWithStudents } from '@/types/parent';

interface AdminAuthorizationFormProps {
  studentId: string;
  studentName: string;
  onAuthorizationCreated: () => void;
}

interface ParentWithSharedStudents extends ParentWithStudents {
  sharedStudentIds?: string[];
  sharedStudentNames?: string[];
}

interface FormData {
  authorizedParentId: string;
  startDate: string;
  endDate: string;
}

const AdminAuthorizationForm: React.FC<AdminAuthorizationFormProps> = ({
  studentId,
  studentName,
  onAuthorizationCreated,
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allParents, setAllParents] = useState<ParentWithSharedStudents[]>([]);
  const [parentsWhoShareStudents, setParentsWhoShareStudents] = useState<ParentWithSharedStudents[]>([]);
  const [showOnlySharedParents, setShowOnlySharedParents] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    authorizedParentId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  useEffect(() => {
    if (showForm) {
      loadParents();
    }
  }, [showForm]);

  const loadParents = async () => {
    try {
      const { parents: availableParents, sharedStudents } = await getAvailableParentsForAuthorization();
      const enhancedAvailableParents = availableParents
        .filter(parent => parent && parent.id)
        .map(parent => ({
          ...parent,
          students: parent.students || [],
          sharedStudentIds: sharedStudents[parent.id] || [],
          sharedStudentNames: []
        }));

      const parentsWithSharedStudents = enhancedAvailableParents.filter(parent => 
        parent.sharedStudentIds && parent.sharedStudentIds.length > 0
      );

      setAllParents(enhancedAvailableParents);
      setParentsWhoShareStudents(parentsWithSharedStudents);
    } catch (error) {
      console.error('Error loading parents:', error);
      toast({
        title: t('common.error'),
        description: t('pickupAuthorizations.loadDataError'),
        variant: 'destructive'
      });
    }
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleParentFilter = () => {
    setShowOnlySharedParents(!showOnlySharedParents);
  };

  const getDisplayParents = () => {
    return showOnlySharedParents ? parentsWhoShareStudents : allParents;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.authorizedParentId || !formData.startDate || !formData.endDate) {
      toast({
        title: t('common.error'),
        description: t('pickupAuthorizations.fillAllFields'),
        variant: 'destructive'
      });
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast({
        title: t('common.error'),
        description: t('pickupAuthorizations.startDateBeforeEndDate'),
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      await createPickupAuthorization({
        studentId,
        authorizedParentId: formData.authorizedParentId,
        startDate: formData.startDate,
        endDate: formData.endDate
      });

      toast({
        title: t('common.success'),
        description: t('pickupAuthorizations.authorizationCreated')
      });

      setFormData({
        authorizedParentId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      setShowForm(false);
      onAuthorizationCreated();
    } catch (error) {
      console.error('Error creating authorization:', error);
      toast({
        title: t('common.error'),
        description: t('pickupAuthorizations.failedToCreate'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <div className="text-center py-6">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('studentDetails.noPickupAuth')}</h3>
        <p className="text-gray-500 mb-4">
          {t('studentDetails.adminCanCreateAuth')}
        </p>
        <Button onClick={() => setShowForm(true)} className="mt-2">
          <Plus className="h-4 w-4 mr-2" />
          {t('pickupAuthorizations.createAuthorization')}
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Plus className="h-5 w-5" />
          {t('pickupAuthorizations.createAuthorizationFor')} {studentName}
        </CardTitle>
        <CardDescription>
          {t('pickupAuthorizations.createAuthorizationDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <SearchOnlyParentSelector
            parents={getDisplayParents()}
            value={formData.authorizedParentId}
            onValueChange={(value) => updateFormData('authorizedParentId', value)}
            placeholder={t('pickupAuthorizations.searchForParent')}
            showOnlySharedParents={showOnlySharedParents}
            onToggleFilter={toggleParentFilter}
            parentsWhoShareStudents={parentsWhoShareStudents}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">{t('pickupAuthorizations.startDate')}</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => updateFormData('startDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">{t('pickupAuthorizations.endDate')}</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => updateFormData('endDate', e.target.value)}
                min={formData.startDate || new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('pickupAuthorizations.creating') : t('pickupAuthorizations.createAuthorization')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminAuthorizationForm;