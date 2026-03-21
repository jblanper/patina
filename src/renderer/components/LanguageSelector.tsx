import React from 'react';
import { useLanguage } from '../hooks/useLanguage';

export const LanguageSelector: React.FC = () => {
  const { language, switchLanguage } = useLanguage();

  return (
    <div className="language-selector sort-dir-toggle" aria-label="Language selector">
      <button
        className={`dir-btn ${language === 'es' ? 'active' : ''}`}
        onClick={() => switchLanguage('es')}
        aria-pressed={language === 'es'}
      >
        ES
      </button>
      <button
        className={`dir-btn ${language === 'en' ? 'active' : ''}`}
        onClick={() => switchLanguage('en')}
        aria-pressed={language === 'en'}
      >
        EN
      </button>
    </div>
  );
};
