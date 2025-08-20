import { useTranslation as useReactI18nTranslation } from 'react-i18next';

export const useTranslation = () => {
  const { t, i18n } = useReactI18nTranslation();

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };

  const getCurrentLanguage = () => {
    return i18n.language;
  };

  return {
    t,
    changeLanguage,
    getCurrentLanguage,
    isSpanish: i18n.language === 'es',
    isEnglish: i18n.language === 'en'
  };
};