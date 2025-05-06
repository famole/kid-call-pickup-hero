
import React, { createContext, useState, useContext, useEffect } from 'react';
import { User, AuthContextType } from '@/types';

// Mock data for development
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
    // Check for saved authentication in localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      // Mock login - would be replaced with actual API call
      const user = mockUsers.find(u => u.email === email);
      
      if (!user) {
        throw new Error('Invalid credentials');
      }
      
      // Save to localStorage
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
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
