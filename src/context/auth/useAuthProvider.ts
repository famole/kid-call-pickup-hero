
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import { AuthState } from '@/types/auth';
import { 
  cleanupAuthState, 
  getParentData, 
  createUserFromParentData, 
  createUserFromAuthData
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
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          try {
            // Defer data fetching to prevent deadlocks
            setTimeout(async () => {
              // Get user data from our database
              const parentData = await getParentData(session.user.email);
                
              if (parentData) {
                setUser(createUserFromParentData(parentData));
              } else {
                // Fall back to auth user data
                setUser(createUserFromAuthData(session.user));
              }
            }, 0);
          } catch (error) {
            console.error("Error in auth state change:", error);
          }
        }
      }
    );
    
    // THEN check for existing session
    const loadUser = async () => {
      try {
        // Try to get session from Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Get user data from our database based on the auth user
          const parentData = await getParentData(session.user.email);
            
          if (parentData) {
            // If we found parent data, use it to create our app user
            setUser(createUserFromParentData(parentData));
          } else {
            // Fall back to auth user data if no parent record exists yet
            setUser(createUserFromAuthData(session.user));
          }
        }
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
        console.error("Sign out before login failed:", signOutError);
      }
      
      // Try to authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
      
      // Get user data from our database
      if (data.user) {
        const parentData = await getParentData(data.user.email);
          
        if (parentData) {
          const appUser = createUserFromParentData(parentData);
          setUser(appUser);
        } else {
          // Fall back to auth user data
          setUser(createUserFromAuthData(data.user));
        }
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error("Login error:", error);
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
      console.error("Error during sign out:", error);
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
