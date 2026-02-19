import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Encryption configuration
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY') || 'U9.#s!_So2*';

// Cache the derived key to avoid repeated PBKDF2 derivation (100k iterations)
let _cachedKey: CryptoKey | null = null;

async function getEncryptionKey(): Promise<CryptoKey> {
  if (_cachedKey) return _cachedKey;

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_KEY),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  _cachedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('upsy-secure-salt-2024'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  return _cachedKey;
}

// Encrypt data
async function encryptData(data: string): Promise<string> {
  const key = await getEncryptionKey();
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );

  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedData), iv.length);

  return btoa(String.fromCharCode(...combined));
}

// Decrypt data
async function decryptData(encryptedData: string): Promise<string> {
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
}

async function encryptObject(obj: any): Promise<string> {
  return await encryptData(JSON.stringify(obj));
}

async function decryptObject(encryptedString: string): Promise<any> {
  try {
    const decryptedString = await decryptData(encryptedString);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Decryption or parsing failed:', error);
    try {
      return JSON.parse(encryptedString);
    } catch {
      return encryptedString;
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ data: null, error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { operation, data } = requestBody;
    console.log('Secure pickup requests operation:', operation);

    switch (operation) {
      case 'getPickupRequests': {
        const { parentId } = data || {};

        let query = supabase
          .from('pickup_requests')
          .select('*')
          .in('status', ['pending', 'called']);

        if (parentId) {
          query = query.eq('parent_id', parentId);
        }

        const { data: requests, error } = await query;
        if (error) throw error;

        const encryptedData = await encryptObject({ data: requests || [], error: null });
        return new Response(
          JSON.stringify({ encryptedData }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'cancelPickupRequest': {
        let decryptedData = await decryptObject(data);
        if (typeof decryptedData === 'string') {
          decryptedData = JSON.parse(decryptedData);
        }

        const { requestId, parentId } = decryptedData;
        if (!requestId) throw new Error('Request ID is required');

        // Parallelize: fetch request + resolve admin status at the same time
        const adminCheckPromise = (async () => {
          if (!authHeader) return false;
          const token = authHeader.replace('Bearer ', '');
          const userClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
          );
          const { data: { user } } = await userClient.auth.getUser(token);
          if (!user?.email) return false;
          const { data: parentData } = await supabase
            .from('parents')
            .select('role')
            .eq('email', user.email)
            .single();
          return parentData?.role === 'admin' || parentData?.role === 'superadmin';
        })();

        const requestPromise = supabase
          .from('pickup_requests')
          .select('parent_id')
          .eq('id', requestId)
          .single();

        const [isAdmin, { data: request, error: fetchError }] = await Promise.all([
          adminCheckPromise,
          requestPromise,
        ]);

        if (fetchError) throw new Error('Failed to fetch pickup request');

        if (!isAdmin && parentId && request.parent_id !== parentId) {
          throw new Error('Not authorized to cancel this pickup request');
        }

        const { data: updatedRequest, error: updateError } = await supabase
          .from('pickup_requests')
          .update({ status: 'cancelled' })
          .eq('id', requestId)
          .select('*')
          .single();

        if (updateError) throw new Error('Failed to cancel pickup request');

        return new Response(
          JSON.stringify({ data: { success: true, request: updatedRequest }, error: null }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'createPickupRequest': {
        let decryptedData = await decryptObject(data);
        if (typeof decryptedData === 'string') {
          decryptedData = JSON.parse(decryptedData);
        }

        const { studentId, parentId } = decryptedData;
        if (!parentId) throw new Error('Parent ID is required');

        const { data: requestData, error } = await supabase
          .from('pickup_requests')
          .insert({
            student_id: studentId,
            parent_id: parentId,
            status: 'pending',
            request_time: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        const encryptedResult = await encryptObject({ data: requestData, error: null });
        return new Response(
          JSON.stringify({ encryptedData: encryptedResult }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getParentAffectedRequests': {
        const { parentId } = data || {};
        if (!parentId) throw new Error('Parent ID is required');

        const today = new Date().toISOString().split('T')[0];

        // Parallel fetch of own children + authorized children
        const [ownChildren, authorizedChildren] = await Promise.all([
          supabase.from('student_parents').select('student_id').eq('parent_id', parentId),
          supabase.from('pickup_authorizations').select('student_id')
            .eq('authorized_parent_id', parentId)
            .eq('is_active', true)
            .lte('start_date', today)
            .gte('end_date', today)
        ]);

        if (ownChildren.error || authorizedChildren.error) {
          throw ownChildren.error || authorizedChildren.error;
        }

        const uniqueStudentIds = [...new Set([
          ...(ownChildren.data?.map(sp => sp.student_id) || []),
          ...(authorizedChildren.data?.map(auth => auth.student_id) || [])
        ])];

        if (uniqueStudentIds.length === 0) {
          const encryptedEmpty = await encryptObject({ data: [], error: null });
          return new Response(
            JSON.stringify({ encryptedData: encryptedEmpty }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: requests, error: requestsError } = await supabase
          .from('pickup_requests')
          .select('*, parents (id, name, email)')
          .in('student_id', uniqueStudentIds)
          .in('status', ['pending', 'called']);

        if (requestsError) throw requestsError;

        const encryptedResult = await encryptObject({ data: requests || [], error: null });
        return new Response(
          JSON.stringify({ encryptedData: encryptedResult }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ data: null, error: 'Invalid operation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in secure pickup requests function:', error);
    return new Response(
      JSON.stringify({
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
