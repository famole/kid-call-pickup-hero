// Environment configuration for Supabase
export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// Development fallback values
const DEVELOPMENT_CONFIG = {
  url: 'https://wrrpndjtdmnparadykrc.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndycnBuZGp0ZG1ucGFyYWR5a3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxOTEwMjEsImV4cCI6MjA2Nzc2NzAyMX0.FSOVIuE0-eiVLBS8oRXx3QKGKtvqR96r0ThgLJQj08Q'
};

// Get Supabase configuration from environment variables or fallback to development
export function getSupabaseConfig(): SupabaseConfig {
  // Try to get from environment variables first
  const envUrl = typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined;
  const envAnonKey = typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined;
  
  // Use environment variables if available, otherwise fallback to development config
  const config = {
    url: envUrl || DEVELOPMENT_CONFIG.url,
    anonKey: envAnonKey || DEVELOPMENT_CONFIG.anonKey,
  };
  
  const source = envUrl && envAnonKey ? 'environment variables' : 'development fallback';
  
  // Only log in non-production environments
  if (import.meta.env.VITE_NODE_ENV !== 'production') {
    console.log(`[Environment] Using Supabase config from: ${source}`);
    console.log(`[Environment] Using Supabase URL: ${config.url}`);
  }
  
  return config;
}