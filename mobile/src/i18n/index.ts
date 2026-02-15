// mobile/src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

// Import translations directly
import en from './locales/en.json';
import es from './locales/es.json';

const resources = {
  en: {
    translation: en,
  },
  es: {
    translation: es,
  },
};

// Get device locale using the new API
const getDeviceLanguage = () => {
  const locales = getLocales();
  console.log('Available locales:', locales);
  
  if (locales && locales.length > 0) {
    const locale = locales[0];
    console.log('Device locale:', locale);
    
    // Get language code from the locale object
    const languageCode = locale.languageCode || 'en';
    return languageCode.toLowerCase();
  }
  
  return 'en';
};

const deviceLanguage = getDeviceLanguage();
const supportedLanguages = ['en', 'es'];
const defaultLanguage = supportedLanguages.includes(deviceLanguage) 
  ? deviceLanguage 
  : 'en';

console.log('Selected language:', defaultLanguage);

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;