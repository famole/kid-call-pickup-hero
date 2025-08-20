import React from 'react';
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, UserCheck, Shield } from "lucide-react";
import { ParentAuthStatus } from '@/services/authStatusService';
import { useTranslation } from '@/hooks/useTranslation';

interface AuthStatusBadgeProps {
  authStatus?: ParentAuthStatus;
}

const AuthStatusBadge: React.FC<AuthStatusBadgeProps> = ({ authStatus }) => {
  const { t } = useTranslation();
  
  if (!authStatus) {
    return null;
  }

  if (!authStatus.has_user) {
    return (
      <Badge variant="secondary" className="text-xs">
        <AlertCircle className="w-3 h-3 mr-1" />
        {t('authStatusBadge.noAccount')}
      </Badge>
    );
  }

  const hasGoogle = authStatus.providers.includes('google');
  const hasPassword = authStatus.providers.includes('password') || authStatus.providers.includes('email');
  
  if (hasGoogle) {
    return (
      <Badge variant="default" className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200">
        <Shield className="w-3 h-3 mr-1" />
        {t('authStatusBadge.google')}
      </Badge>
    );
  }

  if (hasPassword) {
    return (
      <Badge 
        variant={authStatus.email_confirmed ? "default" : "destructive"} 
        className={`text-xs ${authStatus.email_confirmed 
          ? "bg-green-100 text-green-800 hover:bg-green-200" 
          : "bg-orange-100 text-orange-800 hover:bg-orange-200"
        }`}
      >
        {authStatus.email_confirmed ? (
          <CheckCircle className="w-3 h-3 mr-1" />
        ) : (
          <UserCheck className="w-3 h-3 mr-1" />
        )}
        {authStatus.email_confirmed ? t('authStatusBadge.confirmed') : t('authStatusBadge.unconfirmed')}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-xs">
      <AlertCircle className="w-3 h-3 mr-1" />
      {t('authStatusBadge.unknown')}
    </Badge>
  );
};

export default AuthStatusBadge;