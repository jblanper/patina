import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { GLOSSARY_FIELDS, GLOSSARY_SECTIONS } from '../data/glossaryFields';
import { GlossaryEntry } from './Glossary';

interface GlossaryDrawerProps {
  open: boolean;
  field: string | null;
  onClose: () => void;
  onOpenField: (fieldId: string) => void;
  onOpenIndex: () => void;
}

export const GlossaryDrawer: React.FC<GlossaryDrawerProps> = ({
  open,
  field,
  onClose,
  onOpenField,
  onOpenIndex,
}) => {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === 'es' ? 'es' : 'en') as 'en' | 'es';
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(drawerRef, open);

  // Focus close button when drawer opens
  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  // Scroll-lock body while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const matchedField = field ? GLOSSARY_FIELDS.find((f) => f.id === field) : null;

  return (
    <>
      <div
        className="glossary-drawer-backdrop"
        onMouseDown={onClose}
        aria-hidden="true"
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('glossary.title')}
        className="glossary-drawer"
        data-open="true"
      >
        <header className="glossary-drawer-header">
          {matchedField ? (
            <>
              <button className="glossary-drawer-back" onClick={onOpenIndex}>
                ← {t('glossary.allFields')}
              </button>
              <code className="glossary-drawer-field-id">{matchedField.id}</code>
            </>
          ) : (
            <span className="glossary-drawer-title">{t('glossary.title')}</span>
          )}
          <button
            ref={closeButtonRef}
            className="glossary-drawer-close"
            onClick={onClose}
            aria-label={t('glossary.close')}
          >
            ×
          </button>
        </header>

        <div className="glossary-drawer-body">
          {matchedField ? (
            <GlossaryEntry
              field={matchedField}
              lang={lang}
              requiredLabel={t('glossary.required')}
            />
          ) : (
            <>
              {GLOSSARY_SECTIONS.map((section) => {
                const fields = GLOSSARY_FIELDS.filter((f) => f.section === section.id);
                return (
                  <div key={section.id} className="glossary-index-section">
                    <h3 className="glossary-index-section-heading">{section.label[lang]}</h3>
                    {fields.map((f) => (
                      <button
                        key={f.id}
                        className="glossary-index-item"
                        onClick={() => onOpenField(f.id)}
                      >
                        {f.name[lang]}
                      </button>
                    ))}
                  </div>
                );
              })}
              <Link to="/glossary" onClick={onClose} className="glossary-browse-all">
                {t('glossary.browseAll')} ↗
              </Link>
            </>
          )}
        </div>
      </aside>
    </>
  );
};
