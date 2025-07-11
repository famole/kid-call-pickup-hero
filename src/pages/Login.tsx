
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { School, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';

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

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(email, password);
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      navigate('/');
    } catch (error: any) {
      console.error('Authentication error:', error);
      toast({
        title: 'Authentication Error',
        description: error.message || 'Invalid email or password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
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
        title: 'Redirecting to Google...',
        description: 'You will be redirected to complete the login process.',
      });
    } catch (error: any) {
      console.error('Google authentication error:', error);
      toast({
        title: 'Google Login Error',
        description: error.message || 'Failed to login with Google. Please try again.',
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
        toast({
          title: 'Email Not Found',
          description: 'This email is not in our system. Please contact your administrator or check the email address.',
          variant: 'destructive',
        });
        return;
      }

      // Check if this is a preloaded account that needs password setup
      if (parentData.is_preloaded && !parentData.password_set) {
        // Redirect to password setup with email parameter
        navigate(`/password-setup?email=${encodeURIComponent(firstTimeEmail)}`);
      } else if (parentData.password_set) {
        toast({
          title: 'Account Already Set Up',
          description: 'This account already has a password. Please use the regular login form above.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Account Type Not Supported',
          description: 'This account type cannot use first-time setup. Please contact your administrator.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error checking email:', error);
      toast({
        title: 'Error',
        description: 'Failed to check email. Please try again.',
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
                src="/lovable-uploads/ece6442c-dc5f-4017-8cab-7fb80ee8e28a.png"
                alt="Upsy"
                className="h-16 w-auto object-contain"
              />
            </div>
            <CardTitle className="text-2xl text-center">First Time Setup</CardTitle>
            <CardDescription className="text-center">
              Enter your email address to set up your account
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleFirstTimeEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstTimeEmail">Email Address</Label>
                <Input
                  id="firstTimeEmail"
                  type="email"
                  placeholder="Enter your email address"
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
                {isCheckingEmail ? 'Checking...' : 'Continue to Setup'}
              </Button>
            </form>
            
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={handleBackToLogin}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
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
              src="/lovable-uploads/ece6442c-dc5f-4017-8cab-7fb80ee8e28a.png"
              alt="Upsy"
              className="h-16 w-auto object-contain"
            />
          </div>
          <CardTitle className="text-2xl text-center">School Pickup</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
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
            {isGoogleLoading ? 'Signing in with Google...' : 'Continue with Google'}
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
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="password">Password</Label>
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
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          
          {/* First Time Setup Button */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                First time here?
              </span>
            </div>
          </div>
          
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleFirstTimeSetup}
          >
            Set up your account
          </Button>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-4">
          <div className="text-sm text-center">
            New to the system?{" "}
            <span 
              className="text-school-primary hover:underline cursor-pointer"
              onClick={() => navigate('/signup')}
            >
              Sign up
            </span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
