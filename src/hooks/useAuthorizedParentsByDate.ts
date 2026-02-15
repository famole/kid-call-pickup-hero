import { useState, useEffect } from 'react';
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
  const [authorizedParents, setAuthorizedParents] = useState<AuthorizedParent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuthorizedParents = async () => {
      setLoading(true);
      try {
        // Format date in local timezone to avoid timezone conversion issues
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const selectedDate = `${year}-${month}-${day}`;
        const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, etc.

        logger.info('📅 Fetching authorized parents for date:', selectedDate, 'day:', dayOfWeek, 'classId:', classId);

        // Encrypt the request data
        const requestData = {
          date: selectedDate,
          dayOfWeek: dayOfWeek,
          classId: classId || 'all',
          searchTerm: searchTerm || ''
        };
        
        const encryptedData = await encryptData(requestData);

        // Call the secure edge function (no parentId needed for this operation)
        const { data, error } = await supabase.functions.invoke('secure-pickup-authorizations', {
          body: {
            operation: 'getAuthorizedParentsByDate',
            data: encryptedData
          }
        });

        if (error) {
          logger.error('❌ Error fetching authorized parents:', error);
          setAuthorizedParents([]);
          return;
        }

        if (!data || !data.data || !data.data.encrypted_data) {
          logger.warn('⚠️ No encrypted data received');
          setAuthorizedParents([]);
          return;
        }

        // Decrypt the response
        const decryptedData = await decryptData(data.data.encrypted_data);
        const result = typeof decryptedData === 'string' ? JSON.parse(decryptedData) : decryptedData;

        logger.info(`✅ Found ${result.length} authorized parents for ${selectedDate} with class filter: ${classId || 'all'}`);
        logger.info('Authorized parents:', result.map((p: AuthorizedParent) => ({ 
          name: p.parentName, 
          studentsCount: p.students.length 
        })));

        setAuthorizedParents(result);
      } catch (error) {
        logger.error('❌ Error in fetchAuthorizedParents:', error);
        setAuthorizedParents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAuthorizedParents();
  }, [date, classId, searchTerm]);

  return { authorizedParents, loading };
};
