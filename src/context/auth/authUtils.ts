
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';

// Clean up auth state in localStorage
export const cleanupAuthState = () => {
  // Remove standard auth tokens
  localStorage.removeItem('supabase.auth.token');
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  // Remove from sessionStorage if in use
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

// Get parent data from Supabase
export const getParentData = async (email: string | null) => {
  if (!email) return null;
  
  try {
    const { data: parentData, error } = await supabase
      .from('parents')
      .select('*')
      .eq('email', email)
      .single();
      
    if (error) throw error;
    return parentData;
  } catch (error) {
    console.error("Error fetching parent data:", error);
    return null;
  }
};

// Create a User object from parent data
export const createUserFromParentData = (parentData: any): User => {
  return {
    id: parentData.id,
    email: parentData.email,
    name: parentData.name || parentData.email?.split('@')[0] || 'User',
    role: parentData.role || 'parent', // Use the role from the database
  };
};

// Create a User object from auth data
export const createUserFromAuthData = (authUser: any): User => {
  return {
    id: authUser.id,
    email: authUser.email || '',
    name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
    role: 'parent', // Default role
  };
};

// Create parent record from Google OAuth user
export const createParentFromOAuthUser = async (authUser: any): Promise<any> => {
  try {
    const parentData = {
      name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
      email: authUser.email,
      phone: authUser.user_metadata?.phone || undefined,
      role: 'parent' as const // Fix TypeScript error by explicitly typing as const
    };

    const { data, error } = await supabase
      .from('parents')
      .insert(parentData)
      .select()
      .single();

    if (error && error.code !== '23505') { // 23505 is unique violation error
      throw error;
    }

    return data || parentData;
  } catch (error) {
    console.error("Error creating parent from OAuth user:", error);
    return null;
  }
};
