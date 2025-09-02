import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserPlus } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface AuthorizationTypeSelectorProps {
  onSelectType: (type: 'existing' | 'invitation') => void;
  onCancel: () => void;
}

const AuthorizationTypeSelector: React.FC<AuthorizationTypeSelectorProps> = ({
  onSelectType,
  onCancel,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-2">
          {t('pickupAuthorizations.selectAuthorizationType')}
        </h2>
        <p className="text-muted-foreground">
          {t('pickupAuthorizations.selectAuthorizationTypeDescription')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/20">
          <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            {t('pickupAuthorizations.existingParents')}
          </CardTitle>
            <CardDescription>
              {t('pickupAuthorizations.existingParentsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => onSelectType('existing')}
              className="w-full"
              variant="outline"
            >
              {t('pickupAuthorizations.selectExistingParent')}
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/20">
          <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-muted-foreground" />
            {t('pickupAuthorizations.familyMembers')}
          </CardTitle>
            <CardDescription>
              {t('pickupAuthorizations.familyMembersDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => onSelectType('invitation')}
              className="w-full"
              variant="outline"
            >
              {t('pickupAuthorizations.inviteFamilyMember')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );
};

export default AuthorizationTypeSelector;