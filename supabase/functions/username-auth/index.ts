import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

// Password hashing utilities - MUST match client-side hashing
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = 'upsy-password-hash-salt-2024';
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPasswordLegacy(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  if (passwordHash === hash) return true;
  const legacyHash = await hashPasswordLegacy(password);
  return legacyHash === hash;
}

// Link parent record to auth.users via auth_uid (idempotent)
async function linkAuthUid(supabase: any, parentId: string, authUserId: string) {
  try {
    const { error } = await supabase
      .from('parents')
      .update({ auth_uid: authUserId })
      .eq('id', parentId)
      .is('auth_uid', null);
    if (error) console.warn('auth_uid link skipped (may already be set):', error.message);
    else console.log('Linked auth_uid for parent', parentId);
  } catch (e) {
    console.warn('auth_uid link failed:', e);
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier, password } = await req.json();
    console.log('Username auth request for identifier:', identifier);

    let actualPassword = password;
    if (password && password.length > 50) {
      try {
        actualPassword = await decryptPassword(password);
        console.log('Password decrypted successfully');
      } catch (decryptionError) {
        console.warn('Password decryption failed, using as-is:', decryptionError);
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: parentData, error: parentError } = await supabase
      .rpc('get_parent_by_identifier_pwd', { identifier });

    if (parentError) {
      console.error('Error fetching parent:', parentError);
      throw new Error('Authentication failed');
    }

    if (!parentData || parentData.length === 0) {
      console.log('No parent found for identifier:', identifier);
      throw new Error('Invalid credentials');
    }

    const parent = parentData[0];
    console.log('Parent found:', parent.email || 'no email', parent.username || 'no username', 'role:', parent.role);

    if (!parent.password_set) {
      return new Response(JSON.stringify({
        error: 'Password not set',
        requirePasswordSetup: true,
        parentId: parent.id
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Username-only users (no email)
    if (!parent.email) {
      console.log('Username-only user, verifying password hash');
      
      if (!parent.password_hash) {
        throw new Error('Invalid credentials');
      }
      
      const isPasswordValid = await verifyPassword(actualPassword, parent.password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }
      
      console.log('Username-only authentication successful for:', parent.username);
      
      return new Response(JSON.stringify({
        user: null,
        session: null,
        parentData: parent,
        isUsernameAuth: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Email users — use Supabase auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: parent.email,
      password: actualPassword,
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      throw new Error('Invalid credentials');
    }

    console.log('Authentication successful for:', parent.email);

    // Link auth_uid on successful login
    if (authData.user) {
      await linkAuthUid(supabase, parent.id, authData.user.id);
    }

    return new Response(JSON.stringify({
      user: authData.user,
      session: authData.session,
      parentData: parent
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in username-auth function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Authentication failed'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
