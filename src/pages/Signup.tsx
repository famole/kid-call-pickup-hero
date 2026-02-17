
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { createParent } from '@/services/parentService';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/hooks/useTranslation';
import { logger } from '@/utils/logger';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'parent' | 'teacher'>('parent');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Basic validation
    if (email !== confirmEmail) {
      toast({
        title: t('common.error'),
        description: t('errors.emailsDoNotMatch'),
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      // 1. Create Supabase auth user without password - they'll set it after email confirmation
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: 'temp_password_' + Math.random().toString(36), // Temporary password
        options: {
          data: {
            name: name,
            phone: phone,
            role: role
          },
          emailRedirectTo: `${window.location.origin}/password-setup`
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Create parent record with password_set: false so they go through password setup
        const parent = await createParent({
          name,
          email,
          phone: phone || undefined,
          role,
          is_preloaded: false,
          password_set: false
        });

        // 3. Link auth_uid immediately since we have the auth user ID
        try {
          await supabase
            .from('parents')
            .update({ auth_uid: authData.user.id })
            .eq('id', parent.id)
            .is('auth_uid', null);
        } catch (linkErr) {
          logger.warn('auth_uid link on signup failed (will auto-link later):', linkErr);
        }

        setShowEmailConfirmation(true);
        
        toast({
          title: t('errors.checkEmail'),
          description: `${t('errors.confirmationLinkSent')} ${email}. ${t('errors.clickToComplete')}`,
        });
      }
    } catch (error: any) {
      toast({
        title: t('errors.errorCreatingAccount'),
        description: error.message || t('errors.errorOccurredDuringSignup'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        throw error;
      }
      
      // The redirect will happen automatically
      toast({
        title: t('errors.redirectingToGoogle'),
        description: t('errors.redirectToCompleteSignup'),
      });
    } catch (error: any) {
      logger.error('Google signup error:', error);
      toast({
        title: t('errors.googleSignupError'),
        description: error.message || t('errors.failedGoogleSignup'),
        variant: 'destructive',
      });
      setIsGoogleLoading(false);
    }
  };

  if (showEmailConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
        <Card className="w-[400px] shadow-lg">
          <CardHeader className="space-y-1 flex flex-col items-center">
            <div className="bg-school-primary w-12 h-12 rounded-full flex items-center justify-center mb-2">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl text-center">{t('errors.checkYourEmail')}</CardTitle>
            <CardDescription className="text-center">
              {t('errors.confirmationSentTo')} <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                {t('errors.clickLinkToVerify')}
              </p>
              <p className="text-xs text-gray-500">
                {t('errors.didntReceiveEmail')}
              </p>
            </div>
          </CardContent>
          
          <CardFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowEmailConfirmation(false);
                setEmail('');
                setConfirmEmail('');
                setName('');
                setPhone('');
              }}
            >
              Back to Signup
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
      <Card className="w-[400px] shadow-lg">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="bg-school-primary w-12 h-12 rounded-full flex items-center justify-center mb-2">
            <UserPlus className="h-6 w-6 text-white" />
          </div>
            <CardTitle className="text-2xl text-center">{t('auth.createAccount')}</CardTitle>
            <CardDescription className="text-center">
              {t('auth.signupToAccess')}
            </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Google Signup Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignup}
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
            {isGoogleLoading ? 'Signing up with Google...' : 'Continue with Google'}
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          
          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('forms.fullName')}</Label>
              <Input
                id="name"
                placeholder={t('forms.enterName')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
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
              <Label htmlFor="confirmEmail">{t('auth.confirmEmail')}</Label>
              <Input
                id="confirmEmail"
                type="email"
                placeholder="name@example.com"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t('forms.phone')} ({t('common.optional')})</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="555-123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t('auth.role')}</Label>
              <Select value={role} onValueChange={(value: 'parent' | 'teacher') => setRole(value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('auth.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">{t('auth.parent')}</SelectItem>
                  <SelectItem value="teacher">{t('auth.teacher')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-gray-500">
              {t('auth.passwordAfterEmail')}
            </div>
            <Button
              type="submit"
              className="w-full bg-school-primary hover:bg-school-primary/90"
              disabled={isLoading}
            >
              {isLoading ? t('auth.creatingAccount') : t('auth.signUp')}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-4">
          <div className="text-sm text-center">
            {t('auth.alreadyHaveAccount')}{" "}
            <span 
              className="text-school-primary hover:underline cursor-pointer"
              onClick={() => navigate('/login')}
            >
              {t('auth.signIn')}
            </span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Signup;
