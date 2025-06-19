
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

export const usePasswordSetupLogic = () => {
  const [parentData, setParentData] = useState<any>(null);
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const [hasPreloadedAccount, setHasPreloadedAccount] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const initializePasswordSetup = async () => {
      console.log('Initializing password setup, loading:', loading, 'user:', user?.email);
      
      // Wait for auth loading to complete
      if (loading) {
        return;
      }
      
      setAuthCheckComplete(true);
      
      // Check URL parameters for email (from signup confirmation link or direct access)
      const urlParams = new URLSearchParams(window.location.search);
      const emailFromUrl = urlParams.get('email');
      console.log('Email from URL:', emailFromUrl);
      
      // If we have an email from URL but no authenticated user, check for preloaded account
      if (emailFromUrl && !user) {
        console.log('Checking for preloaded account with email:', emailFromUrl);
        try {
          const { data: parentDataResult, error } = await supabase
            .from('parents')
            .select('*')
            .eq('email', emailFromUrl)
            .single();

          if (!error && parentDataResult && !parentDataResult.password_set) {
            console.log('Found preloaded account that needs password setup');
            // This is a preloaded account that needs password setup
            setParentData(parentDataResult);
            setHasPreloadedAccount(true);
            setIsInitialized(true);
            return;
          } else {
            console.log('No preloaded account found or password already set');
          }
        } catch (error) {
          console.error('Error checking preloaded account:', error);
        }
      }
      
      // Handle authenticated users
      if (user?.email) {
        console.log('User is authenticated, checking their status');
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

          // If password already set, redirect to main app
          if (parentDataResult?.password_set) {
            console.log('Password already set, redirecting to main app');
            navigate('/');
            return;
          }

          console.log('Authenticated user needs password setup');
          setIsInitialized(true);
        } catch (error) {
          console.error('Error checking password setup status:', error);
          setIsInitialized(true);
        }
      } else {
        // No authenticated user and no preloaded account found
        console.log('No authenticated user, no preloaded account');
        setIsInitialized(true);
      }
    };

    initializePasswordSetup();
  }, [loading, user, navigate]); // Removed hasPreloadedAccount from dependencies

  console.log('Current state:', {
    isInitialized,
    authCheckComplete,
    hasPreloadedAccount,
    user: user?.email,
    parentData: parentData?.email
  });

  return {
    parentData,
    isOAuthUser,
    isInitialized,
    authCheckComplete,
    loading,
    user,
    hasPreloadedAccount
  };
};
