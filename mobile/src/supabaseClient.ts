import { createClient } from '@supabase/supabase-js';
import type { SupportedStorage } from '@supabase/auth-js';
import type { Database } from '../../src/integrations/supabase/types';
import { getSupabaseConfig } from './config/environment';

const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = getSupabaseConfig();

const memoryStore: Record<string, string> = {};

const memoryStorage: SupportedStorage = {
  getItem: (key) => memoryStore[key] || null,
  setItem: (key, value) => {
    memoryStore[key] = value;
  },
  removeItem: (key) => {
    delete memoryStore[key];
  },
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: memoryStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
