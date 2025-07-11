
// Environment-aware Supabase client configuration
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { getSupabaseConfig } from '@/config/environment';

// Get environment-specific configuration
const config = getSupabaseConfig();

// Import the supabase client like this:
// import { supabase } from '@/integrations/supabase/client';

export const supabase = createClient<Database>(config.url, config.anonKey);
