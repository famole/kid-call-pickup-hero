
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Eye, EyeOff } from 'lucide-react';

const PasswordSetupForm = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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
      // Get email from URL parameters if user is not authenticated (preloaded account scenario)
      const urlParams = new URLSearchParams(window.location.search);
      const emailFromUrl = urlParams.get('email');
      const userEmail = user?.email || emailFromUrl;

      if (!userEmail) {
        throw new Error('No email found for password setup');
      }

      // If user is not authenticated, we need to sign them up first (for preloaded accounts)
      if (!user) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userEmail,
          password: password,
        });

        if (authError) {
          throw authError;
        }

        // Update the parent record to mark password as set
        const { error: updateError } = await supabase
          .from('parents')
          .update({ password_set: true })
          .eq('email', userEmail);

        if (updateError) {
          throw updateError;
        }

        toast({
          title: "Account Setup Complete",
          description: "Your password has been set. Please check your email to verify your account.",
        });

        // Redirect to login page for email verification
        navigate('/login');
      } else {
        // User is already authenticated, just update password
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
          .eq('email', userEmail);

        if (updateError) {
          throw updateError;
        }

        toast({
          title: "Password Set Successfully",
          description: "Your password has been set. You can now access the application.",
        });

        // Redirect to main application
        navigate('/');
      }
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

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
      <Card className="w-[400px] shadow-lg">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="bg-school-primary w-12 h-12 rounded-full flex items-center justify-center mb-2">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl text-center">Set Your Password</CardTitle>
          <CardDescription className="text-center">
            Welcome! Please set a secure password for your account to continue.
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
              {isLoading ? 'Setting Password...' : 'Set Password & Continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PasswordSetupForm;
