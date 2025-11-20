import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';

const resources = {
  en: {
    translation: en
  },
  es: {
    translation: es
  }
};

// Clear any cached language preference to force Spanish
localStorage.removeItem('i18nextLng');

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'es', // Force Spanish as default
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
