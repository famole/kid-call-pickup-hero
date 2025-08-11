import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/integrations/supabase/types';

// Use Expo public env vars when available, fall back to Vite vars or defaults
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://wrrpndjtdmnparadykrc.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndycnBuZGp0ZG1ucGFyYWR5a3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxOTEwMjEsImV4cCI6MjA2Nzc2NzAyMX0.FSOVIuE0-eiVLBS8oRXx3QKGKtvqR96r0ThgLJQj08Q';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
