import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/integrations/supabase/types';

// Use the same production Supabase configuration as the main app
const SUPABASE_URL = "https://bslcyuufvifphfzdgfcl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbGN5dXVmdmlmcGhmemRnZmNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjkzNjYsImV4cCI6MjA2Nzk0NTM2Nn0.HzpSCytm8iu3HZa37vcqozNUNGGfDmCGiv_CMcXJ3uE";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
