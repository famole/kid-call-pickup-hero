
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
      // Reset state when starting initialization
      setIsInitialized(false);
      setAuthCheckComplete(false);
      setHasPreloadedAccount(false);
      
      // Wait for auth loading to complete
      if (loading) {
        return;
      }
      
      setAuthCheckComplete(true);
      
      // Check URL parameters for email (from signup confirmation link)
      const urlParams = new URLSearchParams(window.location.search);
      const emailFromUrl = urlParams.get('email');
      
      // If we have an email from URL but no authenticated user, check for preloaded account
      if (emailFromUrl && !user) {
        try {
          const { data: parentDataResult, error } = await supabase
            .from('parents')
            .select('*')
            .eq('email', emailFromUrl)
            .single();

          if (!error && parentDataResult && !parentDataResult.password_set) {
            // This is a preloaded account that needs password setup
            setParentData(parentDataResult);
            setHasPreloadedAccount(true);
            setIsInitialized(true);
            return;
          }
        } catch (error) {
          console.error('Error checking preloaded account:', error);
        }
      }
      
      // If no user after auth loading is complete and no preloaded account, they need to login
      if (!user?.email && !hasPreloadedAccount) {
        setIsInitialized(true);
        return;
      }

      // Handle authenticated users
      if (user?.email) {
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
            navigate('/');
            return;
          }

          // If user needs password setup (either preloaded OR new signup that hasn't set password)
          // Allow them to proceed with password setup
          setIsInitialized(true);
        } catch (error) {
          console.error('Error checking password setup status:', error);
          setIsInitialized(true);
        }
      } else {
        setIsInitialized(true);
      }
    };

    initializePasswordSetup();
  }, [loading, user, navigate, hasPreloadedAccount]);

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
