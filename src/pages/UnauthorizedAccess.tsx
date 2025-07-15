import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ArrowLeft } from 'lucide-react';

const UnauthorizedAccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 flex flex-col items-center text-center">
          <div className="mb-4">
            <img
              src="/assets/ece6442c-dc5f-4017-8cab-7fb80ee8e28a.png"
              alt="Upsy"
              className="h-16 w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-6 w-6" />
            <CardTitle className="text-2xl">Oops! 😅</CardTitle>
          </div>
          <CardDescription className="text-center text-base">
            It looks like you're not registered in our system yet.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 text-center">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-800 text-sm">
              📧 Please contact your school administrator to get access to the pickup system.
            </p>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>
              🏫 Your school admin can add your email to the system so you can sign in with Google.
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-3">
          <Button
            onClick={() => navigate('/login')}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Button>
          
          <div className="text-xs text-center text-muted-foreground">
            Need help? Contact your school's front office 📞
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default UnauthorizedAccess;