import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/integrations/supabase/types';
import { getSupabaseConfig } from '../../src/config/environment';

// Get configuration (uses environment variables or falls back to development)
const config = getSupabaseConfig();

export const supabase = createClient<Database>(config.url, config.anonKey);
