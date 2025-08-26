
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import { AuthState } from '@/types/auth';
import { logger } from '@/utils/logger';
import { 
  cleanupAuthState, 
  getParentData, 
  createUserFromParentData,
  createUserFromAuthData,
} from './authUtils';

export const useAuthProvider = (): AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
} => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.log('Auth state change:', event, session?.user?.email);
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED' && !session) {
          // Session expired during token refresh - auto sign out
          logger.log('Session expired during token refresh, signing out');
          await logout();
          return;
        } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          try {
            // Defer data fetching to prevent deadlocks
            setTimeout(async () => {
              await handleUserSession(session.user);
            }, 0);
          } catch (error) {
            logger.error("Error in auth state change:", error);
          }
        }
      }
    );
    
    // THEN check for existing session
    const loadUser = async () => {
      try {
        // Try to get session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        logger.log('Initial session check:', session?.user?.email);
        
        // Check if session is expired
        if (error || (session && session.expires_at && new Date(session.expires_at * 1000) < new Date())) {
          logger.log('Session expired or error, signing out');
          await logout();
          return;
        }
        
        if (session?.user) {
          await handleUserSession(session.user);
        }
      } catch (error) {
        logger.error("Error loading user:", error);
        // If there's an error loading the session, it might be expired - sign out
        await logout();
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleUserSession = async (authUser: any) => {
    try {
      logger.log('Handling user session for:', authUser.email);
      
      // Check for invitation token in URL
      const urlParams = new URLSearchParams(window.location.search);
      const invitationToken = urlParams.get('invitation_token');
      
      // Check if this is an OAuth user
      const isOAuthUser =
        !!(authUser.app_metadata?.provider &&
          authUser.app_metadata.provider !== 'email');
      
      logger.log('Is OAuth user:', isOAuthUser);
      logger.log('Invitation token found:', !!invitationToken);
      
      // Get user data from our database based on the auth user
      let parentData = await getParentData(authUser.email);
      logger.log('Parent data found:', parentData ? 'Yes' : 'No');
      
      // If no parent data exists and this is an OAuth user, check if there's an invitation
      if (!parentData && isOAuthUser) {
        if (invitationToken) {
          try {
            // Try to accept the invitation
            const { updatePickupInvitation } = await import('@/services/pickupInvitationService');
            await updatePickupInvitation(invitationToken, { invitationStatus: 'accepted' });
            logger.log('Invitation accepted via OAuth');
            
            // Clear the invitation token from URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Continue with normal flow - the invitation should have created the parent record
            parentData = await getParentData(authUser.email);
          } catch (invitationError) {
            logger.error('Error accepting invitation via OAuth:', invitationError);
          }
        }
        
        // If still no parent data after invitation attempt, reject the authentication
        if (!parentData) {
          logger.log('OAuth user not found in database, redirecting to unauthorized page');
          await supabase.auth.signOut();
          setUser(null);
          setLoading(false);
          
          // Redirect to unauthorized access page
          if (typeof window !== 'undefined') {
            window.location.href = '/unauthorized-access';
          }
          return;
        }
      }

      if (parentData) {
        logger.log('Using parent data, role:', parentData.role);
        
        // For preloaded users who haven't set up their account yet
        if (parentData.is_preloaded && !parentData.password_set) {
          logger.log('User needs password setup');
          // Set the user so password setup page can access their info
          setUser(createUserFromParentData(parentData));

          // Only redirect if we're not already on the password setup page
          if (window.location.pathname !== '/password-setup') {
            window.location.href = '/password-setup';
          }
          return;
        }

        // If we found or created parent data, use it to create our app user
        const user = createUserFromParentData(parentData);
        logger.log('Created user with role:', user.role);
        setUser(user);
      } else {
        logger.log('Using fallback auth user data');
        // Fall back to auth user data if no parent record exists yet
        setUser(createUserFromAuthData(authUser));
      }
    } catch (error) {
      logger.error("Error handling user session:", error);
      // Fall back to auth user data on error
      setUser(createUserFromAuthData(authUser));
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Clean up existing state
      cleanupAuthState();
      
      // Attempt global sign out first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (signOutError) {
        // Continue even if this fails
        logger.error("Sign out before login failed:", signOutError);
      }
      
      // Try to authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
      
      // Handle user session
      if (data.user) {
        await handleUserSession(data.user);
      }
      
      return Promise.resolve();
    } catch (error) {
      logger.error("Login error:", error);
      return Promise.reject(error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // Clean up auth state
    cleanupAuthState();
    
    // Try to sign out from Supabase
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      logger.error("Error during sign out:", error);
    }
    
    setUser(null);
    
    // Force page reload for a clean state
    window.location.href = '/login';
    
    return Promise.resolve();
  };

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  };
};
