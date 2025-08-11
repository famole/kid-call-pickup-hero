export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const DEVELOPMENT_CONFIG = {
  url: 'https://bslcyuufvifphfzdgfcl.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbGN5dXVmdmlmcGhmemRnZmNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjkzNjYsImV4cCI6MjA2Nzk0NTM2Nn0.HzpSCytm8iu3HZa37vcqozNUNGGfDmCGiv_CMcXJ3uE',
};

export function getSupabaseConfig(): SupabaseConfig {
  const metaEnv =
    typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined'
      ? (import.meta.env as Record<string, string | undefined>)
      : undefined;
  const processEnv =
    typeof process !== 'undefined' && typeof process.env !== 'undefined'
      ? (process.env as Record<string, string | undefined>)
      : undefined;

  const url =
    metaEnv?.EXPO_PUBLIC_SUPABASE_URL ||
    metaEnv?.VITE_SUPABASE_URL ||
    processEnv?.EXPO_PUBLIC_SUPABASE_URL ||
    processEnv?.VITE_SUPABASE_URL ||
    DEVELOPMENT_CONFIG.url;

  const anonKey =
    metaEnv?.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    metaEnv?.VITE_SUPABASE_ANON_KEY ||
    processEnv?.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    processEnv?.VITE_SUPABASE_ANON_KEY ||
    DEVELOPMENT_CONFIG.anonKey;

  return { url, anonKey };
}
