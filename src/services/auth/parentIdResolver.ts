import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized parent ID resolver with multiple fallback methods
 * This addresses the issue where get_current_parent_id RPC returns null
 */
export const getCurrentParentId = async (): Promise<string | null> => {
  try {
    // Method 1: Try the RPC function first
    const { data: parentId, error: parentError } = await supabase.rpc('get_current_parent_id');
    
    if (!parentError && parentId) {
      console.log('✅ Got parent ID from RPC:', parentId);
      return parentId;
    }
    
    console.log('⚠️ RPC get_current_parent_id failed or returned null:', parentError);
    
    // Method 2: Check localStorage for username users
    const usernameParentId = localStorage.getItem('username_parent_id');
    if (usernameParentId) {
      console.log('✅ Got parent ID from localStorage:', usernameParentId);
      return usernameParentId;
    }
    
    // Method 3: Check username session data
    const usernameSession = localStorage.getItem('username_session');
    if (usernameSession) {
      try {
        const sessionData = JSON.parse(usernameSession);
        if (sessionData.id) {
          console.log('✅ Got parent ID from username session:', sessionData.id);
          return sessionData.id;
        }
      } catch (parseError) {
        console.error('Error parsing username session:', parseError);
      }
    }
    
    // Method 4: Try to get current user and check if they are a parent directly
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!userError && user) {
      // Check if user ID matches a parent record
      const { data: parentByUid, error: parentByUidError } = await supabase
        .from('parents')
        .select('id')
        .eq('id', user.id)
        .single();
        
      if (!parentByUidError && parentByUid) {
        console.log('✅ Got parent ID by user UID:', parentByUid.id);
        return parentByUid.id;
      }
      
      // Check if user email matches a parent record
      if (user.email) {
        const { data: parentByEmail, error: parentByEmailError } = await supabase
          .from('parents')
          .select('id')
          .eq('email', user.email)
          .single();
          
        if (!parentByEmailError && parentByEmail) {
          console.log('✅ Got parent ID by email:', parentByEmail.id);
          return parentByEmail.id;
        }
      }
      
      // Check user metadata for parent_id
      if (user.user_metadata?.parent_id) {
        console.log('✅ Got parent ID from user metadata:', user.user_metadata.parent_id);
        return user.user_metadata.parent_id;
      }
    }
    
    console.error('❌ All fallback methods failed to get parent ID');
    return null;
  } catch (error) {
    console.error('Error in getCurrentParentId fallback:', error);
    return null;
  }
};

/**
 * Get parent identifier for dashboard queries
 * Returns email for email users, parent ID for username users
 */
export const getParentIdentifierForDashboard = async (): Promise<string | null> => {
  try {
    // First get the current user to determine auth type
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('No authenticated user found:', userError);
      return null;
    }
    
    // If user has email, use email as identifier
    if (user.email) {
      console.log('✅ Using email as parent identifier:', user.email);
      return user.email;
    }
    
    // For username-only users, get parent ID
    const parentId = await getCurrentParentId();
    if (parentId) {
      console.log('✅ Using parent ID as identifier:', parentId);
      return parentId;
    }
    
    console.error('❌ Failed to get parent identifier for dashboard');
    return null;
  } catch (error) {
    console.error('Error in getParentIdentifierForDashboard:', error);
    return null;
  }
};
