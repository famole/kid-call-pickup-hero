
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

// Get parent data using server-side helper - supports both email and username
export const getParentData = async (emailOrUsername: string | null) => {
  if (!emailOrUsername) return null;
  
  try {
    logger.log('Fetching parent data for identifier:', emailOrUsername);
    
    // Use the new database function that can handle both email and username
    const { data: parentData, error } = await supabase
      .rpc('get_parent_by_identifier', { identifier: emailOrUsername });
    
    if (error) {
      logger.error('Error fetching parent data:', error);
      return null;
    }
    
    if (!parentData || parentData.length === 0) {
      logger.log('No parent found for identifier:', emailOrUsername);
      return null;
    }
    
    logger.log('Parent data retrieved:', parentData[0] ? 'Success' : 'No data');
    return parentData[0];
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
export const createUserFromParentData = async (parentData: any): Promise<User> => {
  // Check if user is invited (only has authorizations, no direct student relationships)
  let isInvitedUser = false;
  try {
    const { data } = await supabase.rpc('is_invited_user');
    isInvitedUser = data || false;
  } catch (error) {
    logger.error('Error checking invited user status:', error);
  }

  return {
    id: parentData.id,
    email: parentData.email || null, // Username-only users may not have email
    name: parentData.name || parentData.username || parentData.email?.split('@')[0] || 'User',
    role: parentData.role || 'parent', // This will now include 'teacher' role
    isInvitedUser,
    username: parentData.username, // Add username field
  };
};

// Create a User object from auth data
export const createUserFromAuthData = (authUser: any): User => {
  return {
    id: authUser.id,
    email: authUser.email || null,
    name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'User',
    role: 'parent', // Default role
    username: authUser.user_metadata?.username,
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
