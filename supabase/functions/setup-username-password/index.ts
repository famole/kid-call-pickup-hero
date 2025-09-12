import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Password hashing utilities
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier, password } = await req.json();
    
    console.log('Setting up password for username:', identifier);

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get parent data by username or email
    const { data: parentData, error: parentError } = await supabase
      .rpc('get_parent_by_identifier', { identifier });

    if (parentError) {
      console.error('Error fetching parent:', parentError);
      throw new Error('User not found');
    }

    if (!parentData || parentData.length === 0) {
      console.log('No parent found for identifier:', identifier);
      throw new Error('User not found');
    }

    const parent = parentData[0];
    console.log('Setting password for parent:', parent.email || parent.username);

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Update parent with password hash and mark password as set
    const { error: updateError } = await supabase
      .from('parents')
      .update({ 
        password_hash: passwordHash,
        password_set: true 
      })
      .eq('id', parent.id);

    if (updateError) {
      console.error('Error updating parent password:', updateError);
      throw new Error('Failed to set password');
    }

    console.log('Password setup successful for:', parent.email || parent.username);

    return new Response(JSON.stringify({
      success: true,
      message: 'Password set successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in setup-username-password function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Password setup failed' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});