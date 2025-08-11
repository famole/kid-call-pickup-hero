// Logging utility that respects environment configuration
// Logs are disabled in production environment

const metaEnv =
  typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined'
    ? (import.meta.env as Record<string, any>)
    : {};
const processEnv =
  typeof process !== 'undefined' && typeof process.env !== 'undefined'
    ? process.env
    : {};

const isProduction =
  metaEnv.PROD ||
  metaEnv.MODE === 'production' ||
  processEnv.NODE_ENV === 'production';

export const logger = {
  log: (...args: any[]) => {
    if (!isProduction) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    if (!isProduction) {
      console.error(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (!isProduction) {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (!isProduction) {
      console.info(...args);
    }
  }
};
