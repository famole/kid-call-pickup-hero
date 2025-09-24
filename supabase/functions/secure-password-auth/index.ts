import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Password decryption function (matches client-side encryption)
async function generatePasswordKey(passphrase: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('upsy-password-salt-2024'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

async function decryptPassword(encryptedPassword: string): Promise<string> {
  try {
    const passphrase = Deno.env.get('PASSWORD_ENCRYPTION_KEY') || "P@ssw0rd_3ncrypt!0n_K3y_2024";
    const key = await generatePasswordKey(passphrase);
    const decoder = new TextDecoder();
    
    const combined = new Uint8Array(
      atob(encryptedPassword).split('').map(char => char.charCodeAt(0))
    );
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decryptedPassword = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return decoder.decode(decryptedPassword);
  } catch (error) {
    console.error('Password decryption failed:', error);
    throw new Error('Failed to decrypt password');
  }
}

async function encryptResponse(responseData: any): Promise<string> {
  try {
    const passphrase = Deno.env.get('PASSWORD_ENCRYPTION_KEY') || "P@ssw0rd_3ncrypt!0n_K3y_2024";
    const key = await generatePasswordKey(passphrase);
    const encoder = new TextEncoder();
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = encoder.encode(JSON.stringify(responseData));

    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Response encryption failed:', error);
    throw new Error('Failed to encrypt response');
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { identifier, encryptedPassword, authType } = await req.json()

    if (!identifier || !encryptedPassword) {
      return new Response(
        JSON.stringify({ error: 'Missing identifier or password' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Decrypt the password
    let password: string;
    try {
      password = await decryptPassword(encryptedPassword);
      console.log('Password decrypted successfully for:', identifier);
    } catch (decryptionError) {
      console.error('Password decryption failed:', decryptionError);
      return new Response(
        JSON.stringify({ error: 'Invalid encrypted password format' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if this is an email or username
    const isEmail = identifier.includes('@');

    if (isEmail) {
      // Handle email authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier,
        password: password,
      });

      if (error) {
        console.error('Email auth error:', error);
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { 
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const responseData = { 
        success: true, 
        user: data.user,
        session: data.session,
        authType: 'email'
      };

      const encryptedResponse = await encryptResponse(responseData);
      
      return new Response(
        JSON.stringify({ encryptedData: encryptedResponse }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      // Handle username authentication
      const { data: parentData, error } = await supabase
        .rpc('get_parent_by_identifier', { identifier });

      if (error || !parentData?.[0]) {
        console.error('Username lookup error:', error);
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { 
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const parent = parentData[0];

      // Verify password (this would need to be implemented based on your password storage method)
      // For now, we'll assume the username-auth function handles this
      const { data: authResult, error: authError } = await supabase.functions.invoke('username-auth', {
        body: { identifier, password }
      });

      if (authError || authResult?.error) {
        console.error('Username auth error:', authError || authResult?.error);
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { 
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const responseData = { 
        success: true, 
        parentData: authResult.parentData,
        authType: 'username',
        isUsernameAuth: true
      };

      const encryptedResponse = await encryptResponse(responseData);
      
      return new Response(
        JSON.stringify({ encryptedData: encryptedResponse }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('Secure password auth error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
