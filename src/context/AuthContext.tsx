
import React, { createContext, useState, useContext, useEffect } from 'react';
import { User, AuthContextType } from '@/types';
import { supabase } from '@/integrations/supabase/client';

// Mock data for development when Supabase auth is not set up
const mockUsers = [
  {
    id: '1',
    email: 'parent@example.com',
    name: 'Parent User',
    role: 'parent',
  },
  {
    id: '2',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
  }
] as User[];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
          const { data: parentData } = await supabase
            .from('parents')
            .select('*')
            .eq('email', session.user.email)
            .single();
            
          if (parentData) {
            // If we found parent data, use it to create our app user
            setUser({
              id: parentData.id,
              email: parentData.email,
              name: parentData.name,
              role: 'parent', // Default role for registered users
            });
          } else {
            // Fall back to auth user data if no parent record exists yet
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.email?.split('@')[0] || 'User',
              role: 'parent',
            });
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
            const { data: parentData } = await supabase
              .from('parents')
              .select('*')
              .eq('email', session.user.email)
              .single();
              
            if (parentData) {
              setUser({
                id: parentData.id,
                email: parentData.email,
                name: parentData.name,
                role: 'parent',
              });
            } else {
              // Fall back to auth user data
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.email?.split('@')[0] || 'User',
                role: 'parent',
              });
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
        const { data: parentData, error: parentError } = await supabase
          .from('parents')
          .select('*')
          .eq('email', data.user.email)
          .single();
          
        if (!parentError && parentData) {
          const appUser: User = {
            id: parentData.id,
            email: parentData.email,
            name: parentData.name,
            role: 'parent', // Default role for registered users
          };
          
          setUser(appUser);
        } else {
          // Fall back to auth user data
          setUser({
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.email?.split('@')[0] || 'User',
            role: 'parent',
          });
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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
