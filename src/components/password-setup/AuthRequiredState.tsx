
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';

const AuthRequiredState = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
      <Card className="w-[400px] shadow-lg">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <CardTitle className="text-2xl text-center">{t('auth.authenticationRequired')}</CardTitle>
          <CardDescription className="text-center">
            {t('auth.loginToAccessPassword')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => navigate('/login')}
            className="w-full bg-school-primary hover:bg-school-primary/90"
          >
            {t('auth.goToLogin')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthRequiredState;
