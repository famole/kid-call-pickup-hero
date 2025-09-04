
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
import { useTranslation } from '@/hooks/useTranslation';
import { logger } from '@/utils/logger';

const PasswordSetupForm = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const isValidIdentifier = (identifier: string): boolean => {
    // Check if it's a valid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(identifier) && !identifier.toLowerCase().includes('example.com')) {
      return true;
    }
    // Check if it's a valid username (no @ symbol, at least 3 characters)
    if (!identifier.includes('@') && identifier.length >= 3) {
      return true;
    }
    return false;
  };

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: t('common.error'),
        description: t('errors.passwordsDoNotMatch'),
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: t('common.error'),
        description: t('errors.passwordTooShort'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get identifier (email or username) from URL parameters if user is not authenticated
      const urlParams = new URLSearchParams(window.location.search);
      const identifierFromUrl = urlParams.get('email') || urlParams.get('identifier');
      const userIdentifier = user?.email || identifierFromUrl;

      if (!userIdentifier) {
        throw new Error(t('errors.noEmailForSetup'));
      }

      // Check if this is a password reset scenario by checking if parent exists but password_set is false
      // Use the database function to search by email or username
      const { data: existingParentResult } = await supabase
        .rpc('get_parent_by_identifier', { identifier: userIdentifier });

      const existingParent = existingParentResult?.[0];

      // If user is not authenticated, we need to handle different scenarios
      if (!user) {
        // For username-only users, we need to use the parent's email if available
        const parentEmail = existingParent?.email || userIdentifier;
        
        // Only attempt signup if we have a valid email
        if (isValidIdentifier(parentEmail) && parentEmail.includes('@')) {
          // Always attempt to create a proper auth account, regardless of email domain
          // This handles both new preloaded accounts and password reset scenarios
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: parentEmail,
            password: password,
            options: {
              emailRedirectTo: `${window.location.origin}/`
            }
          });

          if (authError) {
            // If signup fails because user already exists, that's expected for password reset
            if (authError.message?.includes('already registered')) {
              toast({
                title: t('common.success'),
                description: t('errors.accountResetComplete'),
              });
            } else {
              throw authError;
            }
          }
          
          // Update the parent record to mark password as set
          const { error: updateError } = await supabase
            .from('parents')
            .update({ password_set: true })
            .eq('email', parentEmail);

          if (updateError) {
            throw updateError;
          }
        } else {
          // For username-only users without email, use the password setup edge function
          const { data, error } = await supabase.functions.invoke('setup-username-password', {
            body: { identifier: userIdentifier, password }
          });

          if (error) {
            logger.error("Username password setup error:", error);
            throw new Error('Failed to set password');
          }

          if (data?.error) {
            throw new Error(data.error);
          }

          toast({
            title: t('common.success'),
            description: t('errors.accountSetupComplete'),
          });
        }

        toast({
          title: t('errors.accountSetupComplete'),
          description: t('errors.passwordSetSuccessfully'),
        });

        // Redirect to login page so user can sign in with their new password
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
          .eq('email', userIdentifier);

        if (updateError) {
          throw updateError;
        }

        toast({
          title: t('errors.passwordSetSuccess'),
          description: t('errors.passwordSetAccessApp'),
        });

        // Redirect to main application
        navigate('/');
      }
    } catch (error: any) {
      logger.error('Error setting password:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('errors.failedSetPassword'),
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
          <CardTitle className="text-2xl text-center">{t('auth.setYourPassword')}</CardTitle>
          <CardDescription className="text-center">
            {t('auth.welcomeSetPassword')}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handlePasswordSetup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.newPassword')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('auth.enterNewPassword')}
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
              <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t('auth.confirmNewPassword')}
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
              {t('auth.passwordMinLength')}
            </div>
            
            <Button
              type="submit"
              className="w-full bg-school-primary hover:bg-school-primary/90"
              disabled={isLoading}
            >
              {isLoading ? t('auth.settingPassword') : t('auth.setPasswordContinue')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PasswordSetupForm;
