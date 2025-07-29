
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import { logger } from '@/utils/logger';

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

// Get parent data using server-side helper
export const getParentData = async (email: string | null) => {
  if (!email) return null;
  
  try {
    logger.log('Fetching parent data for email:', email);
    
    // Use the server-side helper to get user role first
    const { data: role, error: roleError } = await supabase.rpc('get_user_role', {
      user_email: email
    });
    
    if (roleError) {
      logger.error('Error fetching user role:', roleError);
      // Fallback to direct query if RPC fails
      const { data: parentData, error } = await supabase
        .from('parents')
        .select('*')
        .eq('email', email)
        .single();
        
      if (error) {
        logger.error('Error fetching parent data:', error);
        return null;
      }
      
      logger.log('Parent data retrieved via fallback:', parentData ? 'Success' : 'No data');
      return parentData;
    }
    
    // If we have a role, fetch the full parent data
    const { data: parentData, error } = await supabase
      .from('parents')
      .select('*')
      .eq('email', email)
      .single();
      
    if (error) {
      logger.error('Error fetching parent data:', error);
      return null;
    }
    
    logger.log('Parent data retrieved:', parentData ? 'Success' : 'No data');
    return parentData;
  } catch (error) {
    logger.error("Error fetching parent data:", error);
    return null;
  }
};

// Check if parent is preloaded and needs password setup
export const checkPreloadedParentStatus = async (email: string | null, isOAuthUser: boolean = false) => {
  if (!email) return { isPreloaded: false, needsPasswordSetup: false };
  
  try {
    const { data: parentData, error } = await supabase
      .from('parents')
      .select('is_preloaded, password_set')
      .eq('email', email)
      .single();
      
    if (error) {
      logger.error('Error checking preloaded status:', error);
      return { isPreloaded: false, needsPasswordSetup: false };
    }
    
    // If this is an OAuth user and they're preloaded but password_set is false,
    // update it to true since OAuth users don't need passwords
    if (isOAuthUser && parentData?.is_preloaded && !parentData?.password_set) {
      await supabase
        .from('parents')
        .update({ password_set: true })
        .eq('email', email);
      
      return {
        isPreloaded: parentData?.is_preloaded || false,
        needsPasswordSetup: false // OAuth users never need password setup
      };
    }
    
    return {
      isPreloaded: parentData?.is_preloaded || false,
      needsPasswordSetup: parentData?.is_preloaded && !parentData?.password_set && !isOAuthUser
    };
  } catch (error) {
    logger.error("Error checking preloaded parent status:", error);
    return { isPreloaded: false, needsPasswordSetup: false };
  }
};

// Create a User object from parent data
export const createUserFromParentData = (parentData: any): User => {
  return {
    id: parentData.id,
    email: parentData.email,
    name: parentData.name || parentData.email?.split('@')[0] || 'User',
    role: parentData.role || 'parent', // This will now include 'teacher' role
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
    logger.log('Creating parent record for OAuth user:', authUser.email);
    
    const parentData = {
      name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
      email: authUser.email,
      phone: authUser.user_metadata?.phone || undefined,
      role: 'parent' as const, // Default to parent for OAuth users
      is_preloaded: false, // OAuth users are not preloaded
      password_set: true // OAuth users don't need password setup
    };

    const { data, error } = await supabase
      .from('parents')
      .insert(parentData)
      .select()
      .single();

    if (error && error.code !== '23505') { // 23505 is unique violation error
      logger.error('Error creating parent from OAuth:', error);
      throw error;
    }

    logger.log('Parent record created successfully');
    return data || parentData;
  } catch (error) {
    logger.error("Error creating parent from OAuth user:", error);
    return null;
  }
};
