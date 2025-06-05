
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Eye, EyeOff, UserCheck } from 'lucide-react';

const PasswordSetup = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parentData, setParentData] = useState<any>(null);
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const initializePasswordSetup = async () => {
      // Wait for auth loading to complete
      if (loading) {
        return;
      }
      
      setAuthCheckComplete(true);
      
      // If no user after auth loading is complete, they need to login
      if (!user?.email) {
        setIsInitialized(true);
        return;
      }

      try {
        // Get current session to check if it's OAuth
        const { data: { session } } = await supabase.auth.getSession();
        const isOAuth = !!(session?.user?.app_metadata?.provider && 
                          session?.user?.app_metadata?.provider !== 'email');
        setIsOAuthUser(isOAuth);

        const { data: parentDataResult, error } = await supabase
          .from('parents')
          .select('*')
          .eq('email', user.email)
          .single();

        if (error) {
          console.error('Error checking parent status:', error);
          setIsInitialized(true);
          return;
        }

        setParentData(parentDataResult);

        // If not preloaded or password already set, redirect to main app
        if (!parentDataResult?.is_preloaded || parentDataResult?.password_set) {
          console.log('User does not need password setup, redirecting to main app');
          navigate('/');
          return;
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Error checking preloaded status:', error);
        setIsInitialized(true);
      }
    };

    initializePasswordSetup();
  }, [loading, user, navigate]);

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Update the user's password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: password
      });

      if (authError) {
        throw authError;
      }

      // Update the parent record to mark password as set
      const { error: updateError } = await supabase
        .from('parents')
        .update({ password_set: true })
        .eq('email', user?.email);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Password Set Successfully",
        description: "Your password has been set. You can now access the application.",
      });

      // Redirect to main application
      navigate('/');
    } catch (error: any) {
      console.error('Error setting password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to set password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
      console.error('Error confirming OAuth setup:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to activate account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while initializing or while auth is loading
  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
        <div className="text-center">
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  // Only show authentication required if auth check is complete and no user
  if (authCheckComplete && !user) {
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
  }

  // OAuth user confirmation flow
  if (isOAuthUser && parentData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
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
  }

  // Regular password setup flow for email/password users
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
      <Card className="w-[400px] shadow-lg">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="bg-school-primary w-12 h-12 rounded-full flex items-center justify-center mb-2">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl text-center">Set Your Password</CardTitle>
          <CardDescription className="text-center">
            Welcome! Please set a password for your account to continue.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handlePasswordSetup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              Password must be at least 6 characters long.
            </div>
            
            <Button
              type="submit"
              className="w-full bg-school-primary hover:bg-school-primary/90"
              disabled={isLoading}
            >
              {isLoading ? 'Setting Password...' : 'Set Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PasswordSetup;
