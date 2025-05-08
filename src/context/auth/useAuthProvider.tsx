
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthContextType } from './AuthProvider';
import { User } from '@/types';
import { 
  cleanupAuthState, 
  getParentData, 
  createUserFromParentData, 
  createUserFromAuthData 
} from './authUtils';
import { getMockUser } from './mockData';

export const useAuthProvider = (): AuthContextType => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Check authentication status on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
          // User is authenticated
          const email = session.user.email;
          
          // Try to get parent data from Supabase
          const parentData = await getParentData(email);
          
          let userData: User;
          
          if (parentData) {
            userData = createUserFromParentData(parentData);
            // Set admin role if the user has an admin email
            if (email === 'admin@example.com') {
              userData.role = 'admin';
            }
          } else {
            // Fallback to auth user data
            userData = createUserFromAuthData(session.user);
          }
          
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          // No session found
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
    
    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // User signed in
          const email = session.user?.email;
          
          setTimeout(async () => {
            try {
              // Try to get parent data from Supabase
              const parentData = await getParentData(email);
              
              let userData: User;
              
              if (parentData) {
                userData = createUserFromParentData(parentData);
                // Set admin role if the user has an admin email
                if (email === 'admin@example.com') {
                  userData.role = 'admin';
                }
              } else {
                // Fallback to auth user data
                userData = createUserFromAuthData(session.user);
              }
              
              setUser(userData);
              setIsAuthenticated(true);
            } catch (error) {
              console.error('Error processing auth change:', error);
            }
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          // User signed out
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      // First clean up any existing auth state to prevent conflicts
      cleanupAuthState();
      
      // For demo purposes, allow login with any password
      if (email === 'parent@example.com' || email === 'admin@example.com') {
        // Mock user for demo
        const mockUser = getMockUser(email);
        setUser(mockUser);
        setIsAuthenticated(true);
        return;
      }
      
      // Attempt to sign in with Supabase
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Login error:', error);
        throw error;
      }
      
      // Auth state change listener will handle updating the user state
    } catch (error) {
      console.error('Error in login:', error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Try to sign out with Supabase
      await supabase.auth.signOut();
      
      // Clean up auth state
      cleanupAuthState();
      
      // Clear user state
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error in logout:', error);
      throw error;
    }
  };

  return {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
  };
};
