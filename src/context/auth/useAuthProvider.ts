
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import { AuthState } from '@/types/auth';
import { mockUsers } from './mockData';
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
    // Check for saved authentication in localStorage or Supabase session
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
        } else {
          // Fall back to localStorage for development
          const savedUser = localStorage.getItem('user');
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
        }
      } catch (error) {
        console.error("Error loading user:", error);
        // Check localStorage as fallback
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          try {
            // Get user data from our database
            const parentData = await getParentData(session.user.email);
              
            if (parentData) {
              setUser(createUserFromParentData(parentData));
            } else {
              // Fall back to auth user data
              setUser(createUserFromAuthData(session.user));
            }
          } catch (error) {
            console.error("Error in auth state change:", error);
          }
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Try to authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        // If Supabase auth fails, fall back to mock login for development
        const mockUser = mockUsers.find(u => u.email === email);
        if (mockUser) {
          // Save to localStorage for development
          localStorage.setItem('user', JSON.stringify(mockUser));
          setUser(mockUser);
          return Promise.resolve();
        }
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
      return Promise.reject(error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // Try to sign out from Supabase
    await supabase.auth.signOut();
    
    // Also remove from localStorage for development
    localStorage.removeItem('user');
    setUser(null);
    
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
