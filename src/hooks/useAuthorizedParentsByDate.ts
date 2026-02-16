
import { useQuery } from '@tanstack/react-query';
import { logger } from '@/utils/logger';
import { encryptData, decryptData } from '@/services/encryption/encryptionService';
import { supabase } from '@/integrations/supabase/client';

interface AuthorizedParent {
  parentId: string;
  parentName: string;
  parentEmail: string;
  parentRole?: string;
  students: Array<{
    id: string;
    name: string;
  }>;
}

export const useAuthorizedParentsByDate = (date: Date, classId?: string, searchTerm?: string) => {
  const { data: authorizedParents = [], isLoading: loading } = useQuery({
    queryKey: ['authorized-parents-by-date', date.toISOString().split('T')[0], classId, searchTerm],
    queryFn: async (): Promise<AuthorizedParent[]> => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const selectedDate = `${year}-${month}-${day}`;
      const dayOfWeek = date.getDay();

      logger.info('📅 Fetching authorized parents for date:', selectedDate, 'day:', dayOfWeek, 'classId:', classId);

      const requestData = {
        date: selectedDate,
        dayOfWeek: dayOfWeek,
        classId: classId || 'all',
        searchTerm: searchTerm || ''
      };
      
      const encryptedData = await encryptData(requestData);

      const { data, error } = await supabase.functions.invoke('secure-pickup-authorizations', {
        body: {
          operation: 'getAuthorizedParentsByDate',
          data: encryptedData
        }
      });

      if (error) {
        logger.error('❌ Error fetching authorized parents:', error);
        return [];
      }

      if (!data || !data.data || !data.data.encrypted_data) {
        logger.warn('⚠️ No encrypted data received');
        return [];
      }

      const decryptedData = await decryptData(data.data.encrypted_data);
      const result = typeof decryptedData === 'string' ? JSON.parse(decryptedData) : decryptedData;

      logger.info(`✅ Found ${result.length} authorized parents`);
      return result;
    },
  });

  return { authorizedParents, loading };
};
