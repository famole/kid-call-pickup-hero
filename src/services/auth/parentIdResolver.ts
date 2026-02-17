import { getCurrentParentIdCached } from '@/services/parent/getCurrentParentId';
import { getCachedAuthUser } from '@/services/auth/getCachedAuthUser';
import { logger } from '@/utils/logger';

/**
 * Centralized parent ID resolver — now simplified thanks to auth_uid column.
 * The RPC `get_current_parent_id` handles auth_uid lookup + auto-linking.
 * localStorage fallback kept only for username-only users (no Supabase auth).
 */
export const getCurrentParentId = async (): Promise<string | null> => {
  try {
    // Primary: RPC uses auth_uid with auto-linking fallback
    const parentId = await getCurrentParentIdCached();
    if (parentId) {
      return parentId;
    }

    // Fallback for username-only users (no Supabase auth session)
    const usernameParentId = localStorage.getItem('username_parent_id');
    if (usernameParentId) {
      logger.info('Got parent ID from localStorage (username user):', usernameParentId);
      return usernameParentId;
    }

    const usernameSession = localStorage.getItem('username_session');
    if (usernameSession) {
      try {
        const sessionData = JSON.parse(usernameSession);
        if (sessionData.id) {
          return sessionData.id;
        }
      } catch {
        // ignore parse errors
      }
    }

    logger.error('All methods failed to resolve parent ID');
    return null;
  } catch (error) {
    logger.error('Error in getCurrentParentId:', error);
    return null;
  }
};

/**
 * Get parent identifier for dashboard queries.
 * Returns email for email users, parent ID for username users.
 */
export const getParentIdentifierForDashboard = async (): Promise<string | null> => {
  try {
    const user = await getCachedAuthUser();

    if (user?.email) {
      return user.email;
    }

    // Username-only users
    return getCurrentParentId();
  } catch (error) {
    logger.error('Error in getParentIdentifierForDashboard:', error);
    return null;
  }
};
