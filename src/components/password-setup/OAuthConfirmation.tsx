
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { UserCheck } from 'lucide-react';

interface OAuthConfirmationProps {
  parentData: any;
}

const OAuthConfirmation: React.FC<OAuthConfirmationProps> = ({ parentData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleOAuthConfirmation = async () => {
    setIsLoading(true);

    try {
      // Update the parent record to mark password as set for OAuth users
      const { error: updateError } = await supabase
        .from('parents')
        .update({ password_set: true })
        .eq('email', user?.email);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Welcome to the Pickup Platform",
        description: "Your account has been activated successfully.",
      });

      // Redirect to main application
      navigate('/');
    } catch (error: any) {
      logger.error('Error confirming OAuth setup:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to activate account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
      <Card className="w-[500px] shadow-lg">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="bg-school-primary w-12 h-12 rounded-full flex items-center justify-center mb-2">
            <UserCheck className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl text-center">Welcome to the Pickup Platform</CardTitle>
          <CardDescription className="text-center">
            Please confirm your account information to continue
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold text-lg">Your Account Information</h3>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Name:</span> {parentData.name}
              </div>
              <div>
                <span className="font-medium">Email:</span> {parentData.email}
              </div>
              {parentData.phone && (
                <div>
                  <span className="font-medium">Phone:</span> {parentData.phone}
                </div>
              )}
              <div>
                <span className="font-medium">Role:</span> {parentData.role || 'Parent'}
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              You have been pre-registered for our student pickup management platform. 
              This system allows you to request student pickups and receive notifications 
              when your child is ready to be collected.
            </p>
            <p>
              By confirming below, you agree to use this platform for managing student pickup requests.
            </p>
          </div>
          
          <Button
            onClick={handleOAuthConfirmation}
            className="w-full bg-school-primary hover:bg-school-primary/90"
            disabled={isLoading}
          >
            {isLoading ? 'Activating Account...' : 'Confirm and Access Platform'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthConfirmation;
