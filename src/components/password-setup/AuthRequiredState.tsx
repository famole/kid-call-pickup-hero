
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AuthRequiredState = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
      <Card className="w-[400px] shadow-lg">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <CardTitle className="text-2xl text-center">Authentication Required</CardTitle>
          <CardDescription className="text-center">
            Please log in to access the password setup page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => navigate('/login')}
            className="w-full bg-school-primary hover:bg-school-primary/90"
          >
            Go to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthRequiredState;
