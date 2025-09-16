import { logger } from '@/utils/logger';

// Generate a key from a passphrase for consistent encryption/decryption
const generateKey = async (passphrase: string): Promise<CryptoKey> => {
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
      salt: encoder.encode('upsy-secure-salt-2024'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};

// Get or generate encryption passphrase using environment variable or fallback
const getEncryptionPassphrase = (): string => {
  // Try to get from environment variable first (for production deployments)
  const envKey = import.meta.env?.VITE_ENCRYPTION_KEY || 
                 (typeof process !== 'undefined' && process.env?.VITE_ENCRYPTION_KEY) ||
                 (typeof globalThis !== 'undefined' && (globalThis as any).ENCRYPTION_KEY);
  
  // If environment variable exists, use it
  if (envKey) {
    return envKey;
  }
  
  // Fallback to the default key
  return "U9.#s!_So2*";
};

// Encrypt data
export const encryptData = async (data: any): Promise<string> => {
  try {
    const passphrase = getEncryptionPassphrase();
    const key = await generateKey(passphrase);
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encodedData = encoder.encode(JSON.stringify(data));
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
    logger.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
};

// Decrypt data
export const decryptData = async (encryptedData: string): Promise<any> => {
  try {
    const passphrase = getEncryptionPassphrase();
    const key = await generateKey(passphrase);
    const decoder = new TextDecoder();
    
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

    const decryptedString = decoder.decode(decryptedData);
    return JSON.parse(decryptedString);
  } catch (error) {
    logger.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
};

// Encrypt sensitive fields in an object
export const encryptSensitiveFields = async (obj: any, sensitiveFields: string[]): Promise<any> => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = { ...obj };
  
  for (const field of sensitiveFields) {
    if (result[field] !== undefined && result[field] !== null) {
      result[`${field}_encrypted`] = await encryptData(result[field]);
      delete result[field];
    }
  }
  
  return result;
};

// Decrypt sensitive fields in an object
export const decryptSensitiveFields = async (obj: any, sensitiveFields: string[]): Promise<any> => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = { ...obj };
  
  for (const field of sensitiveFields) {
    const encryptedField = `${field}_encrypted`;
    if (result[encryptedField]) {
      try {
        result[field] = await decryptData(result[encryptedField]);
        delete result[encryptedField];
      } catch (error) {
        logger.warn(`Failed to decrypt field ${field}:`, error);
      }
    }
  }
  
  return result;
};

// Check if encryption is supported
export const isEncryptionSupported = (): boolean => {
  return typeof crypto !== 'undefined' && 
         typeof crypto.subtle !== 'undefined' && 
         typeof crypto.getRandomValues !== 'undefined';
};