import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Encryption utilities
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY') ?? '';
const SENSITIVE_FIELDS = ['email', 'phone', 'name', 'username'];

async function getEncryptionKey() {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
  return key;
}

async function encryptData(data: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);
    
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    return data; // Return original data if encryption fails
  }
}

async function decryptData(encryptedData: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedData; // Return original if decryption fails
  }
}

async function encryptSensitiveFields(obj: any): Promise<any> {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = { ...obj };
  
  for (const field of SENSITIVE_FIELDS) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = await encryptData(result[field]);
    }
  }
  
  return result;
}

async function decryptSensitiveFields(obj: any): Promise<any> {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = { ...obj };
  
  for (const field of SENSITIVE_FIELDS) {
    if (result[field] && typeof result[field] === 'string' && result[field].length > 50) {
      result[field] = await decryptData(result[field]);
    }
  }
  
  return result;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, data, includeDeleted = false } = await req.json();
    console.log('Secure parents operation:', operation);

    switch (operation) {
      case 'getParents': {
        let query = supabase
          .from('parents')
          .select(`
            id,
            name,
            email,
            username,
            phone,
            role,
            created_at,
            updated_at,
            deleted_at
          `);
        
        if (!includeDeleted) {
          query = query.is('deleted_at', null);
        }
        
        const { data: parentsData, error } = await query.order('name');
        
        if (error) {
          console.error('Error fetching parents:', error);
          throw error;
        }

        // Encrypt sensitive fields before sending
        const encryptedParents = await Promise.all(
          (parentsData || []).map(parent => encryptSensitiveFields(parent))
        );

        return new Response(JSON.stringify({ data: encryptedParents, error: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'createParent': {
        // Decrypt data received from client
        const decryptedData = await decryptSensitiveFields(data);
        
        const { data: parentData, error } = await supabase
          .from('parents')
          .insert(decryptedData)
          .select();
        
        if (error) {
          console.error('Error creating parent:', error);
          throw error;
        }

        // Encrypt before sending back
        const encryptedResult = await Promise.all(
          (parentData || []).map(parent => encryptSensitiveFields(parent))
        );

        return new Response(JSON.stringify({ data: encryptedResult, error: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'updateParent': {
        const { parentId, updateData } = data;
        
        // Decrypt data received from client
        const decryptedData = await decryptSensitiveFields(updateData);
        
        const { data: parentData, error } = await supabase
          .from('parents')
          .update(decryptedData)
          .eq('id', parentId)
          .select();
        
        if (error) {
          console.error('Error updating parent:', error);
          throw error;
        }

        // Encrypt before sending back
        const encryptedResult = await Promise.all(
          (parentData || []).map(parent => encryptSensitiveFields(parent))
        );

        return new Response(JSON.stringify({ data: encryptedResult, error: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

  } catch (error) {
    console.error('Error in secure-parents function:', error);
    return new Response(JSON.stringify({ data: null, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});