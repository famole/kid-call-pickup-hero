// Logging utility that respects environment configuration
// Logs are disabled in production environment

const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';

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