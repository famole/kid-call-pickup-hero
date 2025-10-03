import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// Module-level TTL cache and in-flight coalescing for is_invited_user
const TTL_MS = 30_000; // 30 seconds
let cachedValue: boolean | null | undefined = undefined; // undefined = no cache yet
let expiresAt = 0;
let inFlight: Promise<boolean> | null = null;

export const isInvitedUserCached = async (): Promise<boolean> => {
  const now = Date.now();

  // Serve from cache if valid
  if (expiresAt > now && cachedValue !== undefined) {
    return !!cachedValue;
  }

  // Coalesce concurrent calls
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const { data, error } = await supabase.rpc('is_invited_user');
      if (error) {
        logger.error('RPC is_invited_user failed:', error);
        // Negative cache briefly to avoid hammering
        cachedValue = false;
        expiresAt = now + 5_000;
        return false;
      }

      cachedValue = !!data;
      expiresAt = Date.now() + TTL_MS;
      return cachedValue;
    } catch (e) {
      logger.error('Exception invoking is_invited_user:', e);
      cachedValue = false;
      expiresAt = now + 5_000;
      return false;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
};
