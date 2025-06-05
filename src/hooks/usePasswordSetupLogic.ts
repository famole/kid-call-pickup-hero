
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
    console.log('usePasswordSetupLogic effect triggered:', { loading, user: user?.email });
    
    const initializePasswordSetup = async () => {
      // Reset state when starting initialization
      setIsInitialized(false);
      setAuthCheckComplete(false);
      
      // Wait for auth loading to complete
      if (loading) {
        console.log('Auth still loading, waiting...');
        return;
      }
      
      console.log('Auth loading complete, checking user:', user?.email);
      setAuthCheckComplete(true);
      
      // If no user after auth loading is complete, they need to login
      if (!user?.email) {
        console.log('No user found, showing auth required state');
        setIsInitialized(true);
        return;
      }

      try {
        console.log('Checking OAuth status and parent data for user:', user.email);
        
        // Get current session to check if it's OAuth
        const { data: { session } } = await supabase.auth.getSession();
        const isOAuth = !!(session?.user?.app_metadata?.provider && 
                          session?.user?.app_metadata?.provider !== 'email');
        console.log('User is OAuth user:', isOAuth);
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

        console.log('Parent data found:', parentDataResult);
        setParentData(parentDataResult);

        // If not preloaded or password already set, redirect to main app
        if (!parentDataResult?.is_preloaded || parentDataResult?.password_set) {
          console.log('User does not need password setup, redirecting to main app');
          navigate('/');
          return;
        }

        console.log('User needs password setup, initializing flow');
        setIsInitialized(true);
      } catch (error) {
        console.error('Error checking preloaded status:', error);
        setIsInitialized(true);
      }
    };

    initializePasswordSetup();
  }, [loading, user, navigate]); // Make sure to depend on both loading and user

  return {
    parentData,
    isOAuthUser,
    isInitialized,
    authCheckComplete,
    loading,
    user
  };
};
