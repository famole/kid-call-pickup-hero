import { supabase } from '@/integrations/supabase/client';
import { decryptData } from './encryptionService';
import { Class } from '@/types';
import { logger } from '@/utils/logger';

export const secureClassOperations = {
  async getAll(): Promise<Class[]> {
    try {
      logger.log('Calling secure classes endpoint - getAll');
      
      const { data, error } = await supabase.functions.invoke('secure-classes', {
        body: { operation: 'getAll' }
      });

      if (error) {
        logger.error('Error calling secure classes function:', error);
        throw error;
      }

      if (!data?.encryptedData) {
        logger.error('No encrypted data received from secure classes function');
        throw new Error('No encrypted data received');
      }

      logger.log('Decrypting classes data...', {
        encryptedDataLength: data.encryptedData.length,
        encryptedDataType: typeof data.encryptedData
      });
      const decryptedResult = await decryptData(data.encryptedData);
      logger.log('Decryption result:', {
        hasData: !!decryptedResult.data,
        hasError: !!decryptedResult.error,
        dataType: typeof decryptedResult.data,
        dataLength: Array.isArray(decryptedResult.data) ? decryptedResult.data.length : 'not array'
      });
      
      if (decryptedResult.error) {
        logger.error('Database error from secure classes:', decryptedResult.error);
        throw new Error(decryptedResult.error.message || 'Database error');
      }

      logger.log(`Successfully fetched and decrypted ${decryptedResult.data?.length || 0} classes`);
      return decryptedResult.data || [];
    } catch (error) {
      logger.error('Error in secureClassOperations.getAll:', error);
      throw error;
    }
  },

  async getById(id: string): Promise<Class | null> {
    try {
      logger.log('Calling secure classes endpoint - getById:', id);
      
      const { data, error } = await supabase.functions.invoke('secure-classes', {
        body: { operation: 'getById', id }
      });

      if (error) {
        logger.error('Error calling secure classes function:', error);
        throw error;
      }

      if (!data?.encryptedData) {
        logger.error('No encrypted data received from secure classes function');
        throw new Error('No encrypted data received');
      }

      logger.log('Decrypting class data...', {
        encryptedDataLength: data.encryptedData.length,
        encryptedDataType: typeof data.encryptedData
      });
      const decryptedResult = await decryptData(data.encryptedData);
      logger.log('Decryption result:', {
        hasData: !!decryptedResult.data,
        hasError: !!decryptedResult.error,
        dataType: typeof decryptedResult.data
      });
      
      if (decryptedResult.error) {
        logger.error('Database error from secure classes:', decryptedResult.error);
        throw new Error(decryptedResult.error.message || 'Database error');
      }

      logger.log(`Successfully fetched and decrypted class: ${decryptedResult.data?.name || 'null'}`);
      return decryptedResult.data;
    } catch (error) {
      logger.error('Error in secureClassOperations.getById:', error);
      throw error;
    }
  },

  async create(classData: Omit<Class, 'id'>): Promise<Class> {
    try {
      logger.log('Calling secure classes endpoint - create:', classData.name);
      
      const { data, error } = await supabase.functions.invoke('secure-classes', {
        body: { operation: 'create', classData }
      });

      if (error) {
        logger.error('Error calling secure classes function:', error);
        throw error;
      }

      if (!data?.encryptedData) {
        logger.error('No encrypted data received from secure classes function');
        throw new Error('No encrypted data received');
      }

      logger.log('Decrypting created class data...');
      const decryptedResult = await decryptData(data.encryptedData);
      
      if (decryptedResult.error) {
        logger.error('Database error from secure classes:', decryptedResult.error);
        throw new Error(decryptedResult.error.message || 'Database error');
      }

      logger.log(`Successfully created and decrypted class: ${decryptedResult.data?.name}`);
      return decryptedResult.data;
    } catch (error) {
      logger.error('Error in secureClassOperations.create:', error);
      throw error;
    }
  },

  async update(id: string, classData: Partial<Class>): Promise<Class> {
    try {
      logger.log('Calling secure classes endpoint - update:', id);
      
      const { data, error } = await supabase.functions.invoke('secure-classes', {
        body: { operation: 'update', id, classData }
      });

      if (error) {
        logger.error('Error calling secure classes function:', error);
        throw error;
      }

      if (!data?.encryptedData) {
        logger.error('No encrypted data received from secure classes function');
        throw new Error('No encrypted data received');
      }

      logger.log('Decrypting updated class data...');
      const decryptedResult = await decryptData(data.encryptedData);
      
      if (decryptedResult.error) {
        logger.error('Database error from secure classes:', decryptedResult.error);
        throw new Error(decryptedResult.error.message || 'Database error');
      }

      logger.log(`Successfully updated and decrypted class: ${decryptedResult.data?.name}`);
      return decryptedResult.data;
    } catch (error) {
      logger.error('Error in secureClassOperations.update:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      logger.log('Calling secure classes endpoint - delete:', id);
      
      const { data, error } = await supabase.functions.invoke('secure-classes', {
        body: { operation: 'delete', id }
      });

      if (error) {
        logger.error('Error calling secure classes function:', error);
        throw error;
      }

      if (!data?.encryptedData) {
        logger.error('No encrypted data received from secure classes function');
        throw new Error('No encrypted data received');
      }

      logger.log('Decrypting deletion result...');
      const decryptedResult = await decryptData(data.encryptedData);
      
      if (decryptedResult.error) {
        logger.error('Database error from secure classes:', decryptedResult.error);
        throw new Error(decryptedResult.error.message || 'Database error');
      }

      logger.log('Successfully deleted class');
    } catch (error) {
      logger.error('Error in secureClassOperations.delete:', error);
      throw error;
    }
  },

  async migrate(classes: Class[]): Promise<void> {
    try {
      logger.log('Calling secure classes endpoint - migrate:', classes.length);
      
      const { data, error } = await supabase.functions.invoke('secure-classes', {
        body: { operation: 'migrate', classes }
      });

      if (error) {
        logger.error('Error calling secure classes function:', error);
        throw error;
      }

      if (!data?.encryptedData) {
        logger.error('No encrypted data received from secure classes function');
        throw new Error('No encrypted data received');
      }

      logger.log('Decrypting migration result...');
      const decryptedResult = await decryptData(data.encryptedData);
      
      if (decryptedResult.error) {
        logger.error('Database error from secure classes:', decryptedResult.error);
        throw new Error(decryptedResult.error.message || 'Database error');
      }

      logger.log('Successfully migrated classes');
    } catch (error) {
      logger.error('Error in secureClassOperations.migrate:', error);
      throw error;
    }
  }
};