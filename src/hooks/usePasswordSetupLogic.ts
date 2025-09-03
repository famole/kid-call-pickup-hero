
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
      
      // Check URL parameters for identifier (email or username)
      const urlParams = new URLSearchParams(window.location.search);
      const identifierFromUrl = urlParams.get('email') || urlParams.get('identifier');
      console.log('Identifier from URL:', identifierFromUrl);
      
      // If we have an identifier from URL but no authenticated user, check for preloaded account
      if (identifierFromUrl && !user) {
        console.log('Checking for preloaded account with identifier:', identifierFromUrl);
        try {
          // Use the database function to search by email or username
          const { data: parentDataResult, error } = await supabase
            .rpc('get_parent_by_identifier', { identifier: identifierFromUrl });

          console.log('Preloaded account check result:', {
            error: error?.message,
            parentData: parentDataResult?.[0],
            isPreloaded: parentDataResult?.[0]?.is_preloaded,
            passwordSet: parentDataResult?.[0]?.password_set
          });

          if (!error && parentDataResult?.[0]) {
            const parent = parentDataResult[0];
            // Allow password setup for any account that doesn't have password set
            // This handles both preloaded accounts and password reset scenarios
            if (!parent.password_set) {
              console.log('Found account that needs password setup');
              setParentData(parent);
              setHasPreloadedAccount(true);
              setIsInitialized(true);
              return;
            } else if (parent.password_set) {
              console.log('Account already has password set');
              // Redirect to login since password is already set
              navigate('/login');
              return;
            }
          } else {
            console.log('No preloaded account found or error occurred:', error?.message);
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
            .maybeSingle();

          console.log('Authenticated user parent data:', {
            error: error?.message,
            parentData: parentDataResult,
            isPreloaded: parentDataResult?.is_preloaded,
            passwordSet: parentDataResult?.password_set
          });

          if (error) {
            console.error('Error checking parent status:', error);
            setIsInitialized(true);
            return;
          }

          setParentData(parentDataResult);

          // For authenticated users, check if they need password setup
          // This handles cases where users are authenticated but still need to set their password
          if (parentDataResult && !parentDataResult.password_set && !isOAuth) {
            console.log('Authenticated user needs password setup');
            setIsInitialized(true);
            return;
          }

          // If password already set, redirect to main app
          if (parentDataResult?.password_set) {
            console.log('Password already set, redirecting to main app');
            navigate('/');
            return;
          }

          console.log('Authenticated user setup complete');
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
  }, [loading, user, navigate]);

  console.log('Current state:', {
    isInitialized,
    authCheckComplete,
    hasPreloadedAccount,
    user: user?.email,
    parentData: parentData ? {
      email: parentData.email,
      isPreloaded: parentData.is_preloaded,
      passwordSet: parentData.password_set
    } : null
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
