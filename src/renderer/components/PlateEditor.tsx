import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLens } from '../hooks/useLens';
import { QRCodeDisplay } from './Lens/QRCodeDisplay';

type Slot = 'obverse' | 'reverse' | 'edge';

interface PlateEditorProps {
  onImageCaptured: (slot: Slot, path: string) => void;
  onImageCleared: (slot: Slot) => void;
  images: {
    obverse?: string;
    reverse?: string;
    edge?: string;
  };
}

export const PlateEditor: React.FC<PlateEditorProps> = ({ onImageCaptured, onImageCleared, images }) => {
  const { t } = useTranslation();
  const [activeSlot, setActiveSlot] = useState<Slot>('obverse');
  const [showQR, setShowQR] = useState(false);
  const [importError, setImportError] = useState<Partial<Record<Slot, boolean>>>({});
  const qrContainerRef = useRef<HTMLDivElement>(null);

  const handleImageReceived = useCallback((path: string) => {
    onImageCaptured(activeSlot, path);
    setShowQR(false);
  }, [activeSlot, onImageCaptured]);

  const { url, startLens } = useLens(handleImageReceived);

  const handleStartLens = async (slot: Slot) => {
    setActiveSlot(slot);
    await startLens();
    setShowQR(true);
  };

  const handleImportFile = async (slot: Slot) => {
    setActiveSlot(slot);
    setImportError((prev) => ({ ...prev, [slot]: false }));
    try {
      const filePath = await window.electronAPI.importImageFromFile();
      if (filePath) {
        onImageCaptured(slot, filePath);
      }
    } catch (err) {
      console.error('File import failed:', err);
      setImportError((prev) => ({ ...prev, [slot]: true }));
    }
  };

  // A-01: Focus trap for QR dialog
  useEffect(() => {
    if (!showQR) return;

    const container = qrContainerRef.current;
    if (!container) return;

    const closeBtn = container.querySelector<HTMLElement>('.qr-close');
    closeBtn?.focus();

    const focusable = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowQR(false);
        return;
      }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showQR]);

  const secondarySlots: Slot[] = ['reverse', 'edge'];

  const renderSlotCTAs = (slot: Slot) => (
    <div className="lens-cta-stack">
      <div className="plate-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </div>
      <button
        className="btn-lens-primary"
        onClick={(e) => { e.stopPropagation(); handleStartLens(slot); }}
      >
        {t('plateEditor.establishBridge')}
      </button>
      <button
        className="btn-lens-minimal"
        onClick={(e) => { e.stopPropagation(); handleImportFile(slot); }}
      >
        {t('plateEditor.importArchive')}
      </button>
    </div>
  );

  const renderCaptionActions = (slot: Slot, isPrimary = false) => {
    const compact = !isPrimary;
    return (
      <>
        <div className="plate-caption-actions">
          <button
            className={`btn-plate-icon-action${compact ? ' btn-plate-icon-action--compact' : ''}`}
            onClick={(e) => { e.stopPropagation(); handleStartLens(slot); }}
            aria-label={t('plateEditor.replace')}
            data-tooltip={t('plateEditor.replace')}
          >
            {/* Circular arrows — Replace */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M23 4v6h-6"/>
              <path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            <span className="btn-plate-icon-label" aria-hidden="true">{t('plateEditor.replace')}</span>
          </button>
          <div className="plate-action-sep" aria-hidden="true" />
          <button
            className={`btn-plate-icon-action${compact ? ' btn-plate-icon-action--compact' : ''}`}
            onClick={(e) => { e.stopPropagation(); handleImportFile(slot); }}
            aria-label={t('plateEditor.importFile')}
            data-tooltip={t('plateEditor.importFile')}
          >
            {/* Download arrow — Import */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span className="btn-plate-icon-label" aria-hidden="true">{t('plateEditor.importFile')}</span>
          </button>
          <div className="plate-action-sep" aria-hidden="true" />
          <button
            className={`btn-plate-icon-action btn-plate-icon-action--remove${compact ? ' btn-plate-icon-action--compact' : ''}`}
            onClick={(e) => { e.stopPropagation(); onImageCleared(slot); }}
            aria-label={t('plateEditor.clearSlot', { slot: t(`plateEditor.slots.${slot}`) })}
            data-tooltip={t('plateEditor.clearSlot', { slot: '' }).trim()}
          >
            {/* Trash — Remove */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
            <span className="btn-plate-icon-label" aria-hidden="true">{t('plateEditor.clearSlot', { slot: '' }).trim()}</span>
          </button>
        </div>
        {importError[slot] && (
          <p className="plate-import-error">{t('plateEditor.importError')}</p>
        )}
      </>
    );
  };

  return (
    <div className="left-folio">
      {/* P-03 Path A: Hero + Strip */}
      <div className="plate-primary-wrap">
        <div
          className={`plate-primary${activeSlot === 'obverse' ? ' active' : ''}`}
          onClick={() => setActiveSlot('obverse')}
        >
          <div className="plate-frame-edit">
            {images.obverse ? (
              <>
                <img
                  src={`patina-img://${images.obverse}`}
                  alt={t('plateEditor.slots.obverse')}
                  className="plate-preview-img"
                />
                <div className="lens-cta-overlay">
                  <button
                    className="btn-lens-primary"
                    onClick={(e) => { e.stopPropagation(); handleStartLens('obverse'); }}
                  >
                    {t('plateEditor.replace')}
                  </button>
                </div>
              </>
            ) : renderSlotCTAs('obverse')}
          </div>
          <div className="plate-caption">
            {t('plateEditor.plateCaption.obverse')} // {t('plateEditor.slots.obverse').toUpperCase()}
          </div>
          {images.obverse
            ? renderCaptionActions('obverse', true)
            : <>
                {activeSlot === 'obverse' && (
                  <p className="plate-active-hint">{t('plateEditor.activeHint')}</p>
                )}
                {importError['obverse'] && (
                  <p className="plate-import-error">{t('plateEditor.importError')}</p>
                )}
              </>
          }
        </div>
      </div>

      {/* Secondary strip: Reverse + Edge */}
      <div className="plate-secondary-strip">
        {secondarySlots.map((slot) => (
          <div
            key={slot}
            className={`plate-secondary-slot${activeSlot === slot ? ' active' : ''}${images[slot] ? ' filled' : ''}`}
            onClick={() => setActiveSlot(slot)}
          >
            <div className="plate-frame-edit plate-frame-secondary">
              {images[slot] ? (
                <>
                  <img
                    src={`patina-img://${images[slot]}`}
                    alt={t(`plateEditor.slots.${slot}`)}
                    className="plate-preview-img"
                  />
                  <div className="lens-cta-overlay">
                    <button
                      className="btn-lens-primary"
                      onClick={(e) => { e.stopPropagation(); handleStartLens(slot); }}
                    >
                      {t('plateEditor.replace')}
                    </button>
                  </div>
                </>
              ) : (
                <div className="lens-cta-stack lens-cta-stack--compact">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <button
                    className="btn-lens-primary btn-lens-compact"
                    onClick={(e) => { e.stopPropagation(); handleStartLens(slot); }}
                  >
                    {t('plateEditor.establishBridge')}
                  </button>
                  <button
                    className="btn-lens-minimal"
                    onClick={(e) => { e.stopPropagation(); handleImportFile(slot); }}
                  >
                    {t('plateEditor.importArchive')}
                  </button>
                </div>
              )}
            </div>
            <div className="plate-caption plate-caption--secondary">
              {t(`plateEditor.plateCaption.${slot}`)} // {t(`plateEditor.slots.${slot}`).toUpperCase()}
            </div>
            {images[slot]
              ? renderCaptionActions(slot)
              : activeSlot === slot && (
                <p className="plate-active-hint">{t('plateEditor.activeHint')}</p>
              )
            }
            {!images[slot] && importError[slot] && (
              <p className="plate-import-error">{t('plateEditor.importError')}</p>
            )}
          </div>
        ))}
      </div>

      {/* A-01: QR dialog with aria-labelledby and focus trap */}
      {showQR && url && (
        <div
          className="qr-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-dialog-title"
          onClick={() => setShowQR(false)}
        >
          <div className="qr-container" ref={qrContainerRef} onClick={(e) => e.stopPropagation()}>
            <h2 id="qr-dialog-title" className="sr-only">
              {t('plateEditor.scanHint', { slot: t(`plateEditor.slots.${activeSlot}`).toUpperCase() })}
            </h2>
            <button className="qr-close" onClick={() => setShowQR(false)} aria-label={t('plateEditor.closeQr')}>×</button>
            <QRCodeDisplay url={url} />
          </div>
        </div>
      )}
    </div>
  );
};
