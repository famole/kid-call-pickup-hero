import { supabase } from '@/integrations/supabase/client';

export interface ParentAuthStatus {
  email: string;
  has_user: boolean;
  providers: string[];
  email_confirmed: boolean;
  last_sign_in_at: string | null;
}

export const getParentAuthStatuses = async (): Promise<ParentAuthStatus[]> => {
  const { data, error } = await supabase.rpc('get_auth_status_for_parents');
  
  if (error) {
    console.error('Error fetching parent auth statuses:', error);
    throw error;
  }
  
  return data || [];
};