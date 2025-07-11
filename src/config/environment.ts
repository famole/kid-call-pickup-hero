// Environment configuration for different Supabase instances
export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// Configuration for different environments
const environments = {
  production: {
    url: 'https://gdxaqfrodyfygurwrqwm.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkeGFxZnJvZHlmeWd1cndycXdtIiwicm9sZUUlcm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NzQxODAsImV4cCI6MjA2MjE1MDE4MH0.fp64K4QifCqyvyVqSCOlENDyixa3cBO4rpcfmFXgnYU'
  },
  development: {
    // Replace with your development Supabase branch credentials
    url: 'https://your-dev-project-ref.supabase.co',
    anonKey: 'your-dev-anon-key'
  }
} as const;

// Function to detect current environment
function detectEnvironment(): keyof typeof environments {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Production detection - customize these domains based on your setup
    if (hostname.includes('your-production-domain.com') || 
        hostname.includes('main--your-project.lovable.app')) {
      return 'production';
    }
    
    // Development detection for preview branches
    if (hostname.includes('preview--') || 
        hostname.includes('localhost') || 
        hostname.includes('dev-') ||
        hostname.includes('staging-')) {
      return 'development';
    }
  }
  
  // Server-side detection (for mobile or SSR)
  if (typeof process !== 'undefined' && process.env) {
    // Check for GitHub Actions or deployment context
    if (process.env.GITHUB_REF === 'refs/heads/main' || 
        process.env.NODE_ENV === 'production') {
      return 'production';
    }
  }
  
  // Default to development for safety
  return 'development';
}

// Get current environment configuration
export function getSupabaseConfig(): SupabaseConfig {
  const env = detectEnvironment();
  
  console.log(`[Environment] Detected: ${env}`);
  console.log(`[Environment] Using Supabase URL: ${environments[env].url}`);
  
  return environments[env];
}

// Export current environment for debugging
export const currentEnvironment = detectEnvironment();