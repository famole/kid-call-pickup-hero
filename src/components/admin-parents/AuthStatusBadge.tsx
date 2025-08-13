import React from 'react';
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, UserCheck, Shield } from "lucide-react";
import { ParentAuthStatus } from '@/services/authStatusService';

interface AuthStatusBadgeProps {
  authStatus?: ParentAuthStatus;
}

const AuthStatusBadge: React.FC<AuthStatusBadgeProps> = ({ authStatus }) => {
  if (!authStatus) {
    return null;
  }

  if (!authStatus.has_user) {
    return (
      <Badge variant="secondary" className="text-xs">
        <AlertCircle className="w-3 h-3 mr-1" />
        No Account
      </Badge>
    );
  }

  const hasGoogle = authStatus.providers.includes('google');
  const hasPassword = authStatus.providers.includes('password') || authStatus.providers.includes('email');
  
  if (hasGoogle) {
    return (
      <Badge variant="default" className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200">
        <Shield className="w-3 h-3 mr-1" />
        Google
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
        {authStatus.email_confirmed ? "Confirmed" : "Unconfirmed"}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-xs">
      <AlertCircle className="w-3 h-3 mr-1" />
      Unknown
    </Badge>
  );
};

export default AuthStatusBadge;