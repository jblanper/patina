import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { GLOSSARY_FIELDS, GLOSSARY_SECTIONS } from '../data/glossaryFields';
import { GlossaryEntry } from './Glossary';

const TRANSITION_MS = 250;

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

  // Two-phase mount: keep DOM alive during exit transition
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Double-rAF: first frame commits the DOM at translateX(100%),
      // second frame starts the CSS transition to translateX(0).
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), TRANSITION_MS);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useFocusTrap(drawerRef, visible);

  // Focus close button when drawer becomes visible
  useEffect(() => {
    if (visible) closeButtonRef.current?.focus();
  }, [visible]);

  // Scroll-lock — compensate scrollbar width to prevent layout shift
  useEffect(() => {
    if (open) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
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

  if (!mounted) return null;

  const matchedField = field ? GLOSSARY_FIELDS.find((f) => f.id === field) : null;

  return (
    <>
      <div
        className="glossary-drawer-backdrop"
        data-visible={visible}
        onMouseDown={onClose}
        aria-hidden="true"
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('glossary.title')}
        aria-hidden={!visible}
        className="glossary-drawer"
        data-open={visible}
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
            />
          ) : (
            <>
              {GLOSSARY_SECTIONS.map((section) => {
                const fields = GLOSSARY_FIELDS.filter((f) => f.section === section.id);
                return (
                  <div key={section.id} className="glossary-index-section">
                    <h3 className="glossary-index-section-heading">{t(section.labelKey)}</h3>
                    {fields.map((f) => (
                      <button
                        key={f.id}
                        className="glossary-index-item"
                        onClick={() => onOpenField(f.id)}
                      >
                        {t(f.nameKey)}
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
