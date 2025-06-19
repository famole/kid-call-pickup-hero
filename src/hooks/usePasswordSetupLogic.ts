
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
      // Reset state when starting initialization
      setIsInitialized(false);
      setAuthCheckComplete(false);
      
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
