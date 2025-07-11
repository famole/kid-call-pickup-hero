import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/integrations/supabase/types';
import { getSupabaseConfig } from '../../src/config/environment';

// Get environment-specific configuration with fallback to environment variables
const config = getSupabaseConfig();
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? config.url;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? config.anonKey;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
