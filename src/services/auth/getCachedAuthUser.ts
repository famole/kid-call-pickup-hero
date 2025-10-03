import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// Short-lived cache for Supabase auth user
const TTL_MS = 10_000; // 10 seconds
let cachedUser: SupabaseUser | null | undefined = undefined; // undefined => no cache
let expiresAt = 0;
let inFlight: Promise<SupabaseUser | null> | null = null;

export const getCachedAuthUser = async (): Promise<SupabaseUser | null> => {
  const now = Date.now();

  // Serve from cache if valid
  if (expiresAt > now && cachedUser !== undefined) {
    return cachedUser ?? null;
  }

  // Coalesce concurrent calls
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        logger.warn('getCachedAuthUser: getUser error, negative-caching briefly:', error);
        cachedUser = null;
        expiresAt = now + 3_000; // brief negative cache
        return null;
      }
      cachedUser = data.user ?? null;
      expiresAt = Date.now() + TTL_MS;
      return cachedUser;
    } catch (e) {
      logger.error('getCachedAuthUser: exception:', e);
      cachedUser = null;
      expiresAt = now + 3_000;
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
};

export const invalidateCachedAuthUser = () => {
  cachedUser = undefined;
  expiresAt = 0;
};
