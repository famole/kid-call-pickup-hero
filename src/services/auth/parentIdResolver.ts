import { supabase } from "@/integrations/supabase/client";
import { getCurrentParentIdCached } from '@/services/parent/getCurrentParentId';
import { getCachedAuthUser } from '@/services/auth/getCachedAuthUser';
import { logger } from '@/utils/logger'

/**
 * Centralized parent ID resolver with multiple fallback methods
 * This addresses the issue where get_current_parent_id RPC returns null
 */
export const getCurrentParentId = async (): Promise<string | null> => {
  try {
    // Method 1: Try cached helper (which calls RPC under the hood with TTL + coalescing)
    const parentId = await getCurrentParentIdCached();
    if (parentId) {
      logger.info('✅ Got parent ID from cached helper:', parentId);
      return parentId;
    }
    logger.info('⚠️ Cached helper returned null for get_current_parent_id');
    
    // Method 2: Check localStorage for username users
    const usernameParentId = localStorage.getItem('username_parent_id');
    if (usernameParentId) {
      logger.info('✅ Got parent ID from localStorage:', usernameParentId);
      return usernameParentId;
    }
    
    // Method 3: Check username session data
    const usernameSession = localStorage.getItem('username_session');
    if (usernameSession) {
      try {
        const sessionData = JSON.parse(usernameSession);
        if (sessionData.id) {
          logger.info('✅ Got parent ID from username session:', sessionData.id);
          return sessionData.id;
        }
      } catch (parseError) {
        logger.error('Error parsing username session:', parseError);
      }
    }
    
    // Method 4: Try to get current user and resolve via email or metadata (cached)
    const user = await getCachedAuthUser();
    if (user) {
      // Check if user email matches a parent record
      if (user.email) {
        const { data: parentByEmail, error: parentByEmailError } = await supabase
          .from('parents')
          .select('id')
          .eq('email', user.email)
          .single();

        if (!parentByEmailError && parentByEmail) {
          logger.info('✅ Got parent ID by email:', parentByEmail.id);
          return parentByEmail.id;
        }
      }

      // Check user metadata for parent_id
      if (user.user_metadata?.parent_id) {
        logger.info('✅ Got parent ID from user metadata:', user.user_metadata.parent_id);
        return user.user_metadata.parent_id;
      }
    }
    
    logger.error('❌ All fallback methods failed to get parent ID');
    return null;
  } catch (error) {
    logger.error('Error in getCurrentParentId fallback:', error);
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
    const user = await getCachedAuthUser();
    
    if (!user) {
      logger.error('No authenticated user found');
      return null;
    }
    
    // If user has email, use email as identifier
    if (user.email) {
      logger.info('✅ Using email as parent identifier:', user.email);
      return user.email;
    }
    
    // For username-only users, get parent ID
    const parentId = await getCurrentParentId();
    if (parentId) {
      logger.info('✅ Using parent ID as identifier:', parentId);
      return parentId;
    }
    
    logger.error('❌ Failed to get parent identifier for dashboard');
    return null;
  } catch (error) {
    logger.error('Error in getParentIdentifierForDashboard:', error);
    return null;
  }
};
