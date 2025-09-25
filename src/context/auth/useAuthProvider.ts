
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
import { decryptPassword, isPasswordEncryptionSupported, decryptResponse } from '@/services/encryption';

export const useAuthProvider = (): AuthState & {
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
} => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    // Clean up auth state
    cleanupAuthState();
    
    // Clean up username session
    localStorage.removeItem('username_session');
    
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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.log('Auth state change:', event, session?.user?.email);
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          // Also clear custom username session
          localStorage.removeItem('username_session');
        } else if (event === 'TOKEN_REFRESHED' && !session) {
          // Session expired during token refresh - try one more refresh before signing out
          logger.log('Session expired during token refresh, attempting final refresh');
          try {
            const { data: finalRefresh } = await supabase.auth.refreshSession();
            if (!finalRefresh.session) {
              logger.log('Final refresh failed, signing out');
              await logout();
              return;
            }
          } catch (finalError) {
            logger.error('Final refresh error:', finalError);
            await logout();
            return;
          }
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
        // Try to get session from Supabase first
        let { data: { session }, error } = await supabase.auth.getSession();
        logger.log('Initial session check:', session?.user?.email);
        
        // Check if session is expired
        if (error || (session && session.expires_at && new Date(session.expires_at * 1000) < new Date())) {
          logger.log('Session expired or error, attempting refresh');
          // Don't immediately logout - try to refresh the session first
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !refreshData.session) {
              logger.log('Session refresh failed, signing out');
              await logout();
              return;
            } else {
              logger.log('Session refreshed successfully');
              // Continue with the refreshed session
              session = refreshData.session;
            }
          } catch (refreshError) {
            logger.error('Error refreshing session:', refreshError);
            await logout();
            return;
          }
        }
        
        if (session?.user) {
          await handleUserSession(session.user);
        } else {
          // Check for username-only session in localStorage
          const usernameSession = localStorage.getItem('username_session');
          if (usernameSession) {
            try {
              const sessionData = JSON.parse(usernameSession);
              // Check if session is still valid (24 hours)
              const sessionAge = Date.now() - sessionData.timestamp;
              const twentyFourHours = 24 * 60 * 60 * 1000;
              
              if (sessionAge < twentyFourHours) {
                logger.log('Found valid username session for:', sessionData.username);
                
                // Create a proper anonymous Supabase session to enable database functions
                try {
                  const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
                  if (!anonError && anonData.user) {
                    // Update the anonymous user with our parent data
                    await supabase.auth.updateUser({
                      data: { 
                        parent_id: sessionData.id,
                        username: sessionData.username,
                        role: sessionData.role,
                        name: sessionData.name
                      }
                    });
                    logger.log('Restored Supabase session for username user:', sessionData.username);
                  }
                } catch (sessionError) {
                  logger.error('Error creating Supabase session on restore:', sessionError);
                }
                
                const mockUser = {
                  id: sessionData.id,
                  email: null,
                  user_metadata: {
                    name: sessionData.name,
                    username: sessionData.username,
                    role: sessionData.role,
                    parent_id: sessionData.id
                  }
                };
                await handleUserSession(mockUser);
              } else {
                logger.log('Username session expired, removing');
                localStorage.removeItem('username_session');
              }
            } catch (parseError) {
              logger.error('Error parsing username session:', parseError);
              localStorage.removeItem('username_session');
            }
          }
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
      
      // If no parent data exists and this is an OAuth user without invitation, try one more time before rejecting
      if (!parentData && isOAuthUser) {
        logger.log('OAuth user not found in database, retrying parent data fetch');
        // Retry parent data fetch once more in case of temporary database issue
        try {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          parentData = await getParentData(authUser.email);
        } catch (retryError) {
          logger.error('Retry parent data fetch failed:', retryError);
        }
        
        // If still no parent data after retry, then redirect to unauthorized
        if (!parentData) {
          logger.log('OAuth user still not found after retry, redirecting to unauthorized page');
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
      
      // Always try secure authentication first for better security
      // Check if password appears to be encrypted (length > 50 indicates encryption)
      const isEncrypted = password.length > 50;
      const isEmail = identifier.includes('@');
      
      // Try secure authentication first for all users (encrypted and plain text)
      try {
        logger.log('Attempting secure authentication for:', identifier, 'encrypted:', isEncrypted);
        
        // Use secure-password-auth endpoint for all authentication attempts
        const { data: rawData, error } = await supabase.functions.invoke('secure-password-auth', {
          body: { 
            identifier, 
            encryptedPassword: password,
            authType: identifier.includes('@') ? 'email' : 'username'
          }
        });
        
        if (error) {
          logger.error("Secure password auth error:", error);
          // Don't throw immediately, try fallback authentication
          throw error;
        }
        
        // Decrypt the encrypted response
        let data;
        try {
          if (rawData.encryptedData) {
            data = await decryptResponse(rawData.encryptedData);
            logger.log('Auth response decrypted successfully');
          } else {
            // Fallback for unencrypted responses
            data = rawData;
          }
        } catch (decryptionError) {
          logger.error('Failed to decrypt auth response:', decryptionError);
          throw new Error('Authentication response decryption failed');
        }
        
        if (data.error) {
          if (data.requirePasswordSetup) {
            // Redirect to password setup for username-only users
            window.location.href = `/password-setup?identifier=${encodeURIComponent(identifier)}`;
            return;
          }
          throw new Error(data.error);
        }
        
        // Handle successful authentication
        if (data.user && data.session) {
          // For email authentication, set the session in Supabase auth context
          logger.log('Setting Supabase session from secure auth response');
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          });
          await handleUserSession(data.user);
        } else if (data.user) {
          await handleUserSession(data.user);
        } else if (data.isUsernameAuth && data.parentData) {
          // Username-only authentication (no Supabase auth)
          // Store parent context in localStorage for username users
          logger.log('Setting up username auth session for parent:', data.parentData.id);
          
          // Store the parent ID in localStorage so it can be used by queries
          localStorage.setItem('username_parent_id', data.parentData.id);
          
          logger.log('Stored parent ID for username user:', data.parentData.id);
          
          // Store session in localStorage for persistence
          const sessionData = {
            id: data.parentData.id,
            name: data.parentData.name,
            username: data.parentData.username,
            role: data.parentData.role,
            timestamp: Date.now()
          };
          localStorage.setItem('username_session', JSON.stringify(sessionData));
          
          logger.log('🔍 Username auth success - stored session for:', data.parentData.username);
          
          const mockUser = {
            id: data.parentData.id,
            email: null,
            user_metadata: {
              name: data.parentData.name,
              username: data.parentData.username,
              role: data.parentData.role,
              parent_id: data.parentData.id
            }
          };
          
          logger.log('🔍 Created mock user for username auth:', mockUser);
          await handleUserSession(mockUser);
          
          // After successful username authentication, redirect to appropriate page
          setTimeout(() => {
            const userRole = data.parentData.role;
            if (['admin', 'superadmin'].includes(userRole)) {
              window.location.href = '/admin';
            } else {
              window.location.href = '/';
            }
          }, 100);
        }
        
        logger.log('Secure authentication successful');
        return; // Exit early on success
        
      } catch (secureAuthError) {
        logger.warn('Secure authentication failed, trying fallback:', secureAuthError);
        
        // Fallback to standard authentication methods
        // Handle plain text passwords (fallback for compatibility)
        const isEmail = identifier.includes('@');
        
        if (isEmail) {
          // Try regular Supabase email/password auth
          const { data, error } = await supabase.auth.signInWithPassword({
            email: identifier,
            password: password,
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
            body: { identifier, password: password }
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
          
          // For username auth, handle different response structures
          if (data.user && data.session) {
            // Regular Supabase auth response (user has email)
            await handleUserSession(data.user);
          } else if (data.isUsernameAuth && data.parentData) {
            // Username-only authentication (no Supabase auth)
            // Store parent context in localStorage for username users
            logger.log('Setting up username auth session for parent:', data.parentData.id);
            
            // Store the parent ID in localStorage so it can be used by queries
            localStorage.setItem('username_parent_id', data.parentData.id);
            
            logger.log('Stored parent ID for username user:', data.parentData.id);
            
            // Store session in localStorage for persistence
            const sessionData = {
              id: data.parentData.id,
              name: data.parentData.name,
              username: data.parentData.username,
              role: data.parentData.role,
              timestamp: Date.now()
            };
            localStorage.setItem('username_session', JSON.stringify(sessionData));
            
            logger.log('🔍 Username auth success - stored session for:', data.parentData.username);
            
            const mockUser = {
              id: data.parentData.id,
              email: null,
              user_metadata: {
                name: data.parentData.name,
                username: data.parentData.username,
                role: data.parentData.role,
                parent_id: data.parentData.id
              }
            };
            
            logger.log('🔍 Created mock user for username auth:', mockUser);
            await handleUserSession(mockUser);
            
            // After successful username authentication, redirect to appropriate page
            setTimeout(() => {
              const userRole = data.parentData.role;
              if (['admin', 'superadmin'].includes(userRole)) {
                window.location.href = '/admin';
              } else {
                window.location.href = '/';
              }
            }, 100);
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
      }
      
      return Promise.resolve();
    } catch (error) {
      logger.error("Login error:", error);
      return Promise.reject(error);
    } finally {
      setLoading(false);
    }
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
