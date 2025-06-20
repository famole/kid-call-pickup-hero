import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://gdxaqfrodyfygurwrqwm.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkeGFxZnJvZHlmeWd1cndycXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NzQxODAsImV4cCI6MjA2MjE1MDE4MH0.fp64K4QifCqyvyVqSCOlENDyixa3cBO4rpcfmFXgnYU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
