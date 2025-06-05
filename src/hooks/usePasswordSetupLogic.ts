
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

export const usePasswordSetupLogic = () => {
  const [parentData, setParentData] = useState<any>(null);
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

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

  return {
    parentData,
    isOAuthUser,
    isInitialized,
    authCheckComplete,
    loading,
    user
  };
};
