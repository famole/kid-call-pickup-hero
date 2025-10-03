import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// Module-level TTL cache and in-flight coalescing for get_current_parent_id
const TTL_MS = 30_000; // 30 seconds
let cachedValue: string | null | undefined = undefined; // undefined means no cache yet
let expiresAt = 0;
let inFlight: Promise<string | null> | null = null;

export const getCurrentParentIdCached = async (): Promise<string | null> => {
  const now = Date.now();

  // Serve from cache if valid
  if (expiresAt > now && cachedValue !== undefined) {
    return cachedValue;
  }

  // Coalesce concurrent calls
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const { data, error } = await supabase.rpc('get_current_parent_id');
      if (error) {
        logger.error('RPC get_current_parent_id failed:', error);
        // Brief negative cache to avoid hammering
        cachedValue = null;
        expiresAt = now + 5_000;
        return null;
      }

      cachedValue = data ?? null;
      expiresAt = Date.now() + TTL_MS;
      return cachedValue;
    } catch (e) {
      logger.error('Exception invoking get_current_parent_id:', e);
      cachedValue = null;
      expiresAt = now + 5_000;
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
};
