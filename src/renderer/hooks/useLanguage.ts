import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export type Language = 'en' | 'es';

export function useLanguage() {
  const { i18n } = useTranslation();
  const language = i18n.language as Language;

  const switchLanguage = useCallback(async (lang: Language) => {
    await i18n.changeLanguage(lang);
    try {
      await window.electronAPI.setPreference('language', lang);
    } catch {
      // Preference persistence failure is non-fatal
    }
  }, [i18n]);

  return { language, switchLanguage };
}
