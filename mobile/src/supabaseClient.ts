import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/integrations/supabase/types';

// Environment-based configuration
const getSupabaseConfig = () => {
  // In Expo, you can use environment variables like this:
  // const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
  // const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  // For now, using direct config but you can switch to env vars
  const isDevelopment = __DEV__; // React Native development flag
  
  if (isDevelopment) {
    return {
      url: "https://wrrpndjtdmnparadykrc.supabase.co",
      anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndycnBuZGp0ZG1ucGFyYWR5a3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxOTEwMjEsImV4cCI6MjA2Nzc2NzAyMX0.FSOVIuE0-eiVLBS8oRXx3QKGKtvqR96r0ThgLJQj08Q"
    };
  }
  
  return {
    url: "https://bslcyuufvifphfzdgfcl.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbGN5dXVmdmlmcGhmemRnZmNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjkzNjYsImV4cCI6MjA2Nzk0NTM2Nn0.HzpSCytm8iu3HZa37vcqozNUNGGfDmCGiv_CMcXJ3uE"
  };
};

const config = getSupabaseConfig();
export const supabase = createClient<Database>(config.url, config.anonKey);
