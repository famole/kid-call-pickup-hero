import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    const passphrase = "P@ssw0rd_3ncrypt!0n_K3y_2024";
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
    const passphrase = "P@ssw0rd_3ncrypt!0n_K3y_2024";
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

// Link parent record to auth.users via auth_uid (idempotent)
async function linkAuthUid(supabase: any, parentId: string, authUserId: string) {
  try {
    const { error } = await supabase
      .from('parents')
      .update({ auth_uid: authUserId })
      .eq('id', parentId)
      .is('auth_uid', null);
    if (error) console.warn('auth_uid link skipped:', error.message);
    else console.log('Linked auth_uid for parent', parentId);
  } catch (e) {
    console.warn('auth_uid link failed:', e);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { identifier, encryptedPassword, authType } = await req.json()

    if (!identifier || !encryptedPassword) {
      return new Response(
        JSON.stringify({ error: 'Missing identifier or password' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let password: string;
    const isLikelyEncrypted = encryptedPassword.length > 50;
    
    if (isLikelyEncrypted) {
      try {
        password = await decryptPassword(encryptedPassword);
      } catch {
        password = encryptedPassword;
      }
    } else {
      password = encryptedPassword;
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const isEmail = identifier.includes('@');

    if (isEmail) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier,
        password: password,
      });

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Link auth_uid on successful email login
      if (data.user) {
        const { data: parentRow } = await supabase
          .from('parents')
          .select('id')
          .eq('email', identifier)
          .is('auth_uid', null)
          .maybeSingle();
        if (parentRow) {
          await linkAuthUid(supabase, parentRow.id, data.user.id);
        }
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
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      const { data: parentData, error } = await supabase
        .rpc('get_parent_by_identifier_pwd', { identifier });

      if (error || !parentData?.[0]) {
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: authResult, error: authError } = await supabase.functions.invoke('username-auth', {
        body: { identifier, password }
      });

      if (authError || authResult?.error) {
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Secure password auth error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
