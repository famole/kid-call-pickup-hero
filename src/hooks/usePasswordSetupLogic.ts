
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger'

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
      logger.info('Initializing password setup, loading:', loading, 'user:', user?.email);
      
      // Wait for auth loading to complete
      if (loading) {
        return;
      }
      
      setAuthCheckComplete(true);
      
      // Check URL parameters for identifier (email or username) or parentId
      const urlParams = new URLSearchParams(window.location.search);
      let identifierFromUrl = urlParams.get('email') || urlParams.get('identifier');
      
      // If we have parentId, fetch the parent data to get the identifier
      const parentId = urlParams.get('parentId');
      if (parentId && !identifierFromUrl) {
        try {
          // Use secure RPC function to get parent data by ID
          const { data: allParentsData, error } = await supabase
            .rpc('get_parent_by_identifier', { identifier: parentId });
          
          const parentDataResult = allParentsData?.[0];
          
          if (!error && parentDataResult) {
            identifierFromUrl = parentDataResult.email || parentDataResult.username;
          }
        } catch (error) {
          logger.error('Error fetching parent by ID:', error);
        }
      }
      
      logger.info('Identifier from URL:', identifierFromUrl);
      
      // If we have an identifier from URL but no authenticated user, check for preloaded account
      if (identifierFromUrl && !user) {
        logger.info('Checking for preloaded account with identifier:', identifierFromUrl);
        try {
          // Use the database function to search by email or username
          const { data: parentDataResult, error } = await supabase
            .rpc('get_parent_by_identifier', { identifier: identifierFromUrl });

          logger.info('Preloaded account check result:', {
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
              logger.info('Found account that needs password setup');
              setParentData(parent);
              setHasPreloadedAccount(true);
              setIsInitialized(true);
              return;
            } else if (parent.password_set) {
              logger.info('Account already has password set');
              // Redirect to login since password is already set
              navigate('/login');
              return;
            }
          } else {
            logger.info('No preloaded account found or error occurred:', error?.message);
          }
        } catch (error) {
          logger.error('Error checking preloaded account:', error);
        }
      }
      
      // Handle authenticated users
      if (user?.email) {
        logger.info('User is authenticated, checking their status');
        try {
          // Get current session to check if it's OAuth
          const { data: { session } } = await supabase.auth.getSession();
          const isOAuth = !!(session?.user?.app_metadata?.provider && 
                            session?.user?.app_metadata?.provider !== 'email');
          setIsOAuthUser(isOAuth);

          // Use secure RPC function to get parent data
          const { data: parentDataArray, error } = await supabase
            .rpc('get_parent_by_identifier', { identifier: user.email });
          
          const parentDataResult = parentDataArray?.[0];

          logger.info('Authenticated user parent data:', {
            error: error?.message,
            parentData: parentDataResult,
            isPreloaded: parentDataResult?.is_preloaded,
            passwordSet: parentDataResult?.password_set
          });

          if (error) {
            logger.error('Error checking parent status:', error);
            setIsInitialized(true);
            return;
          }

          setParentData(parentDataResult);

          // For authenticated users, check if they need password setup
          // This handles cases where users are authenticated but still need to set their password
          if (parentDataResult && !parentDataResult.password_set && !isOAuth) {
            logger.info('Authenticated user needs password setup');
            setIsInitialized(true);
            return;
          }

          // If password already set, redirect to main app
          if (parentDataResult?.password_set) {
            logger.info('Password already set, redirecting to main app');
            navigate('/');
            return;
          }

          logger.info('Authenticated user setup complete');
          setIsInitialized(true);
        } catch (error) {
          logger.error('Error checking password setup status:', error);
          setIsInitialized(true);
        }
      } else {
        // No authenticated user and no preloaded account found
        logger.info('No authenticated user, no preloaded account');
        setIsInitialized(true);
      }
    };

    initializePasswordSetup();
  }, [loading, user, navigate]);

  logger.info('Current state:', {
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
