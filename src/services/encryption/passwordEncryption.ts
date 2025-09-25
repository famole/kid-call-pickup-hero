import { logger } from '@/utils/logger';

// Generate a key from a passphrase for password encryption
const generatePasswordKey = async (passphrase: string): Promise<CryptoKey> => {
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
};

// Get password encryption passphrase
const getPasswordEncryptionPassphrase = (): string => {
  // Use consistent hardcoded key to ensure client/server compatibility
  return "P@ssw0rd_3ncrypt!0n_K3y_2024";
};

// Encrypt password for transmission
export const encryptPassword = async (password: string): Promise<string> => {
  try {
    const passphrase = getPasswordEncryptionPassphrase();
    const key = await generatePasswordKey(passphrase);
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encodedPassword = encoder.encode(password);
    const encryptedPassword = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedPassword
    );

    // Combine IV and encrypted password
    const combined = new Uint8Array(iv.length + encryptedPassword.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedPassword), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    logger.error('Password encryption failed:', error);
    throw new Error('Failed to encrypt password');
  }
};

// Decrypt password (for server-side use)
export const decryptPassword = async (encryptedPassword: string): Promise<string> => {
  try {
    const passphrase = getPasswordEncryptionPassphrase();
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
    logger.error('Password decryption failed:', error);
    throw new Error('Failed to decrypt password');
  }
};

// Hash password for storage (one-way hashing)
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const encoder = new TextEncoder();
    const salt = 'upsy-password-hash-salt-2024';
    const data = encoder.encode(password + salt);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    logger.error('Password hashing failed:', error);
    throw new Error('Failed to hash password');
  }
};

// Check if password encryption is supported
export const isPasswordEncryptionSupported = (): boolean => {
  return typeof crypto !== 'undefined' && 
         typeof crypto.subtle !== 'undefined' && 
         typeof crypto.getRandomValues !== 'undefined';
};

// Decrypts an encrypted response from the server
export async function decryptResponse(encryptedData: string): Promise<any> {
  if (!isPasswordEncryptionSupported()) {
    throw new Error('Password encryption not supported in this browser');
  }

  try {
    const passphrase = getPasswordEncryptionPassphrase();
    const key = await generatePasswordKey(passphrase);
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
    console.error('Response decryption failed:', error);
    throw new Error('Failed to decrypt response');
  }
}

/**
 * Validates password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
