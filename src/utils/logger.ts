// Logging utility that respects environment configuration
// Set VITE_NODE_ENV=production in your production environment to disable console logs

const isProduction = import.meta.env.VITE_NODE_ENV === 'production';

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