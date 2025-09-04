
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
  login: (identifier: string, password: string) => Promise<void>;
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
      logger.log('Handling user session for:', authUser.email || authUser.user_metadata?.username);
      
      // Check for invitation token in URL or user metadata
      const urlParams = new URLSearchParams(window.location.search);
      const invitationToken = urlParams.get('invitation_token') || authUser.user_metadata?.invitation_token;
      
      // Check if this is an OAuth user
      const isOAuthUser =
        !!(authUser.app_metadata?.provider &&
          authUser.app_metadata.provider !== 'email');
      
      logger.log('Is OAuth user:', isOAuthUser);
      logger.log('Invitation token found:', !!invitationToken);
      
      // For username-only users, we already have the parent data in user_metadata
      // Don't fetch it again from database
      let parentData = null;
      if (authUser.user_metadata?.role && !authUser.email) {
        // This is a username-only user, use the data from user_metadata
        logger.log('🔍 Using username-only user data from metadata:', authUser.user_metadata);
        parentData = {
          id: authUser.id,
          name: authUser.user_metadata.name,
          username: authUser.user_metadata.username,
          role: authUser.user_metadata.role,
          email: null
        };
      } else {
        // Regular email user, fetch from database
        parentData = await getParentData(authUser.email);
      }
      
      logger.log('Parent data found:', parentData ? 'Yes' : 'No');
      logger.log('🔍 Parent data role:', parentData?.role);
      
      // Handle invitation acceptance if we have a token
      if (invitationToken && !parentData) {
        try {
          logger.log('Processing invitation with token:', invitationToken);
          // Try to accept the invitation by token
          const { getInvitationByToken, updatePickupInvitation } = await import('@/services/pickupInvitationService');
          
          // Get invitation details first
          const invitationData = await getInvitationByToken(invitationToken);
          if (invitationData && invitationData.invitedEmail === authUser.email && invitationData.invitationStatus === 'pending') {
            // Accept the invitation only if it's still pending
            await updatePickupInvitation(invitationData.id, { invitationStatus: 'accepted' });
            logger.log('Invitation accepted successfully');
            
            // Clear the invitation token from URL
            if (urlParams.get('invitation_token')) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
            
            // Refresh parent data after invitation acceptance
            parentData = await getParentData(authUser.email);
          } else if (invitationData) {
            logger.log('Invitation already processed or not valid for this user');
          }
        } catch (invitationError) {
          logger.error('Error accepting invitation:', invitationError);
        }
      }
      
      // If no parent data exists and this is an OAuth user without invitation, reject the authentication
      if (!parentData && isOAuthUser) {
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

      if (parentData) {
        logger.log('Using parent data, role:', parentData.role);
        
        // For preloaded users who haven't set up their account yet
        if (parentData.is_preloaded && !parentData.password_set) {
          logger.log('User needs password setup');
          // Set the user so password setup page can access their info
          const user = await createUserFromParentData(parentData);
          setUser(user);

          // Only redirect if we're not already on the password setup page
          if (window.location.pathname !== '/password-setup') {
            window.location.href = '/password-setup';
          }
          return;
        }

        // Check for pending invitations for this user
        try {
          const { data: pendingInvitations } = await supabase
            .from('pickup_invitations')
            .select('invitation_token')
            .eq('invited_email', authUser.email)
            .eq('invitation_status', 'pending')
            .gt('expires_at', new Date().toISOString())
            .limit(1);

          // If user has pending invitations and we're not already on an invitation page, redirect
          if (pendingInvitations && pendingInvitations.length > 0 && 
              !window.location.pathname.includes('accept-invitation') &&
              !window.location.pathname.includes('password-setup')) {
            const invitationToken = pendingInvitations[0].invitation_token;
            logger.log('Found pending invitation, redirecting to accept invitation page');
            window.location.href = `/accept-invitation/${invitationToken}`;
            return;
          }
        } catch (invitationCheckError) {
          logger.error('Error checking for pending invitations:', invitationCheckError);
          // Continue with normal flow if invitation check fails
        }

        // If we found or created parent data, use it to create our app user
        const user = await createUserFromParentData(parentData);
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

  const login = async (identifier: string, password: string) => {
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
      
      // Check if this looks like a username (no @ symbol) or email
      const isEmail = identifier.includes('@');
      
      if (isEmail) {
        // Try regular Supabase email/password auth first
        const { data, error } = await supabase.auth.signInWithPassword({
          email: identifier,
          password,
        });
        
        if (error) {
          throw error;
        }
        
        // Handle user session
        if (data.user) {
          await handleUserSession(data.user);
        }
      } else {
        // Use username auth edge function
        const { data, error } = await supabase.functions.invoke('username-auth', {
          body: { identifier, password }
        });
        
        if (error) {
          logger.error("Username auth error:", error);
          throw new Error('Invalid credentials');
        }
        
        if (data.error) {
          if (data.requirePasswordSetup) {
            // Redirect to password setup for username-only users
            window.location.href = `/password-setup?identifier=${encodeURIComponent(identifier)}`;
            return;
          }
          throw new Error(data.error);
        }
        
        // For username auth, we might get different response structures
        if (data.user && data.session) {
          // Regular Supabase auth response (user has email)
          await handleUserSession(data.user);
        } else if (data.isUsernameAuth && data.parentData) {
          // Username-only authentication (no Supabase auth)
          // Create a mock user session for username-only users
          logger.log('🔍 Username auth success - parentData from edge function:', data.parentData);
          
          const mockUser = {
            id: data.parentData.id,
            email: null,
            user_metadata: {
              name: data.parentData.name,
              username: data.parentData.username,
              role: data.parentData.role
            }
          };
          
          logger.log('🔍 Created mock user for username auth:', mockUser);
          await handleUserSession(mockUser);
        } else if (data.requireUsernameAuth) {
          // Fallback for old response format
          const mockUser = {
            id: data.parentData.id,
            email: null,
            user_metadata: {
              name: data.parentData.name,
              username: data.parentData.username
            }
          };
          await handleUserSession(mockUser);
        } else {
          throw new Error('Authentication failed');
        }
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
    isAuthenticated: !!user,
    isInvitedUser: user?.isInvitedUser || false
  };
};
