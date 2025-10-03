
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
import { encryptPassword, isPasswordEncryptionSupported, validatePasswordStrength } from '@/services/encryption';

const PasswordSetupForm = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user, login } = useAuth();
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

    // Enhanced password validation
    const validation = validatePasswordStrength(password);
    if (!validation.isValid) {
      toast({
        title: t('common.error'),
        description: validation.errors.join('. '),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get identifier (email or username) from URL parameters if user is not authenticated
      const urlParams = new URLSearchParams(window.location.search);
      let identifierFromUrl = urlParams.get('email') || urlParams.get('identifier');
      
      // If we have parentId, fetch the parent data to get the identifier
      const parentId = urlParams.get('parentId');
      if (parentId && !identifierFromUrl && !user) {
        try {
          const { data: parentDataResult, error } = await supabase
            .from('parents')
            .select('email, username')
            .eq('id', parentId)
            .maybeSingle();
          
          if (!error && parentDataResult) {
            identifierFromUrl = parentDataResult.email || parentDataResult.username;
          }
        } catch (error) {
          console.error('Error fetching parent by ID:', error);
        }
      }
      
      const userIdentifier = user?.email || identifierFromUrl;

      if (!userIdentifier) {
        throw new Error(t('errors.noEmailForSetup'));
      }

      // Encrypt password before sending for enhanced security
      let encryptedPassword = password;
      if (isPasswordEncryptionSupported()) {
        try {
          encryptedPassword = await encryptPassword(password);
          logger.log('Password encrypted for setup transmission');
        } catch (encryptionError) {
          logger.warn('Password encryption failed during setup, using plain text:', encryptionError);
          // Continue with plain text if encryption fails
        }
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
            // Check if this is a password reset scenario (user exists but password_set is false)
            if (existingParent && !existingParent.password_set) {
              // This is a password reset - user already exists in auth, we need to update their password
              // First, try to sign in with a temporary password or use admin API
              
              // For password reset, we'll use the setup-username-password function which can handle existing users
              const { data, error } = await supabase.functions.invoke('setup-username-password', {
                body: { identifier: parentEmail, password: encryptedPassword }
              });

              if (error) {
                logger.error("Password reset setup error:", error);
                throw new Error('Failed to reset password');
              }

              if (data?.error) {
                throw new Error(data.error);
              }
            } else {
              // This is a new account setup
              const { data: authData, error: authError } = await supabase.auth.signUp({
                email: parentEmail,
                password: encryptedPassword,
                options: {
                  emailRedirectTo: `${window.location.origin}/`
                }
              });

              if (authError) {
                // If signup fails because user already exists, try password reset approach
                if (authError.message?.includes('already registered')) {
                  // Try using the password setup function as fallback
                  const { data, error } = await supabase.functions.invoke('setup-username-password', {
                    body: { identifier: parentEmail, password: encryptedPassword }
                  });

                  if (error || data?.error) {
                    throw new Error('User already exists and password reset failed');
                  }
                } else {
                  throw authError;
                }
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
            body: { identifier: userIdentifier, password: encryptedPassword }
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

          // For username-only users, automatically log them in after password setup
          try {
            await login(userIdentifier, encryptedPassword);
            // The login function should handle the redirect to dashboard
            return;
          } catch (loginError) {
            logger.error('Auto-login after password setup failed:', loginError);
            // If auto-login fails, redirect to login page
            toast({
              title: t('common.info'),
              description: 'Password set successfully. Please log in with your credentials.',
            });
            navigate('/login');
            return;
          }
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
          password: encryptedPassword
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Error setting password:', error);
      toast({
        title: t('common.error'),
        description: errorMessage || t('errors.failedSetPassword'),
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
