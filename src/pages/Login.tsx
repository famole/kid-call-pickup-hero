
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { School, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/hooks/useTranslation';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showFirstTimeSetup, setShowFirstTimeSetup] = useState(false);
  const [firstTimeEmail, setFirstTimeEmail] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('invitation_token');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (invitationToken) {
        navigate(`/accept-invitation/${invitationToken}`);
      } else {
        navigate('/');
      }
    }
  }, [isAuthenticated, navigate, invitationToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(email, password);
      toast({
        title: t('auth.welcomeBack'),
        description: t('auth.welcomeBack'),
      });
      
      // Redirect to invitation if token exists, otherwise to home
      if (invitationToken) {
        navigate(`/accept-invitation/${invitationToken}`);
      } else {
        navigate('/');
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      toast({
        title: t('errors.authenticationError'),
        description: error.message || t('errors.invalidEmailPassword'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    
    try {
      const redirectTo = invitationToken 
        ? `${window.location.origin}/accept-invitation/${invitationToken}`
        : `${window.location.origin}/`;
        
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo
        }
      });
      
      if (error) {
        throw error;
      }
      
      // The redirect will happen automatically
      toast({
        title: t('errors.redirectingToGoogle'),
        description: t('errors.redirectToCompleteLogin'),
      });
    } catch (error: any) {
      console.error('Google authentication error:', error);
      toast({
        title: t('errors.googleLoginError'),
        description: error.message || t('errors.failedGoogleLogin'),
        variant: 'destructive',
      });
      setIsGoogleLoading(false);
    }
  };

  const handleFirstTimeSetup = () => {
    setShowFirstTimeSetup(true);
  };

  const handleBackToLogin = () => {
    setShowFirstTimeSetup(false);
    setFirstTimeEmail('');
  };

  const handleFirstTimeEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCheckingEmail(true);

    try {
      // Check if this email exists as a preloaded account
      const { data: parentData, error } = await supabase
        .from('parents')
        .select('email, password_set, is_preloaded')
        .eq('email', firstTimeEmail)
        .single();

      if (error) {
        // If invitation token exists and user doesn't exist, redirect to invitation signup
        if (invitationToken) {
          navigate(`/invitation-signup/${invitationToken}?email=${encodeURIComponent(firstTimeEmail)}`);
          return;
        }

        toast({
          title: t('errors.emailNotFound'),
          description: t('errors.emailNotInSystem'),
          variant: 'destructive',
        });
        return;
      }

      // Check if this is a preloaded account that needs password setup
      if (parentData.is_preloaded && !parentData.password_set) {
        // Redirect to password setup with email parameter and invitation token if exists
        const passwordSetupUrl = invitationToken 
          ? `/password-setup?email=${encodeURIComponent(firstTimeEmail)}&invitation_token=${invitationToken}`
          : `/password-setup?email=${encodeURIComponent(firstTimeEmail)}`;
        navigate(passwordSetupUrl);
      } else if (parentData.password_set) {
        toast({
          title: t('errors.accountAlreadySetup'),
          description: t('errors.accountHasPassword'),
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('errors.accountTypeNotSupported'),
          description: t('errors.contactAdministrator'),
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error checking email:', error);
      toast({
        title: t('common.error'),
        description: t('errors.errorCheckingEmail'),
        variant: 'destructive',
      });
    } finally {
      setIsCheckingEmail(false);
    }
  };

  if (showFirstTimeSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
        <Card className="w-[350px] shadow-lg">
          <CardHeader className="space-y-1 flex flex-col items-center">
            <div className="mb-4">
            <img
              src="/assets/ece6442c-dc5f-4017-8cab-7fb80ee8e28a.png"
              alt="Upsy"
              className="h-24 w-auto object-contain"
            />
            </div>
            <CardTitle className="text-2xl text-center">{t('auth.firstTimeSetup')}</CardTitle>
            <CardDescription className="text-center">
              {invitationToken 
                ? 'Ingresá tu email para configurar tu cuenta y aceptar la invitación'
                : t('auth.enterEmailToSetup')
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleFirstTimeEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstTimeEmail">{t('auth.emailAddress')}</Label>
                <Input
                  id="firstTimeEmail"
                  type="email"
                  placeholder={t('auth.enterEmailPlaceholder')}
                  value={firstTimeEmail}
                  onChange={(e) => setFirstTimeEmail(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-school-primary hover:bg-school-primary/90"
                disabled={isCheckingEmail}
              >
                {isCheckingEmail ? t('auth.checking') : t('auth.continueToSetup')}
              </Button>
            </form>
            
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={handleBackToLogin}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('auth.backToLogin')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
      <Card className="w-[350px] shadow-lg">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="mb-4">
            <img
              src="/assets/ece6442c-dc5f-4017-8cab-7fb80ee8e28a.png"
              alt="Upsy"
              className="h-24 w-auto object-contain"
            />
          </div>
          <CardTitle className="text-2xl text-center">{t('auth.schoolPickup')}</CardTitle>
          <CardDescription className="text-center">
            {t('auth.enterCredentials')}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Google Login Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isGoogleLoading ? t('auth.signingInWithGoogle') : t('auth.continueWithGoogle')}
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t('auth.orContinueWith')}
              </span>
            </div>
          </div>
          
          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-school-primary hover:bg-school-primary/90"
              disabled={isLoading}
            >
              {isLoading ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
          </form>
          
          {/* First Time Setup Button */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t('auth.firstTimeHere')}
              </span>
            </div>
          </div>
          
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleFirstTimeSetup}
          >
            {t('auth.setupAccount')}
          </Button>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-4">
          <div className="text-sm text-center">
            {t('auth.newToSystem')}{" "}
            <span 
              className="text-school-primary hover:underline cursor-pointer"
              onClick={() => navigate('/signup')}
            >
              {t('auth.signUp')}
            </span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
