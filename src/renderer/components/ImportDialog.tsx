import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { ZipPreviewResult, ZipImportResult } from '../../main/import/zip';
import type { DuplicateInfo, RowError } from '../../main/import/csv';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

type Step = 'loading' | 'error' | 'zip-review' | 'duplicate-review' | 'result';

const STEP_NUMBERS: Record<Step, number> = {
  'loading': 1,
  'error': 1,
  'zip-review': 1,
  'duplicate-review': 2,
  'result': 3,
};
const TOTAL_STEPS = 3;

function stepHeadingKey(step: Step): string {
  const map: Record<Step, string> = {
    'loading': 'import.title',
    'error': 'import.title',
    'zip-review': 'import.fromZip',
    'duplicate-review': 'import.reviewDuplicates',
    'result': 'import.result',
  };
  return map[step];
}

export const ImportDialog: React.FC<ImportDialogProps> = ({ isOpen, onClose, onImportComplete }) => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);

  const [step, setStep] = useState<Step>('loading');
  const [isExecuting, setIsExecuting] = useState(false);
  const [zipPreview, setZipPreview] = useState<ZipPreviewResult | null>(null);
  const [zipResult, setZipResult] = useState<ZipImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(false);
  const [pendingDuplicates, setPendingDuplicates] = useState<DuplicateInfo[]>([]);
  const [duplicateSelections, setDuplicateSelections] = useState<Set<number>>(new Set());

  // Trigger file picker immediately when the dialog opens
  useEffect(() => {
    if (!isOpen) return;

    setStep('loading');
    setIsExecuting(true);
    setZipPreview(null);
    setZipResult(null);
    setErrorMessage(null);
    setSkipDuplicates(false);
    setPendingDuplicates([]);
    setDuplicateSelections(new Set());

    window.electronAPI.importZipPreview()
      .then(result => {
        if ('cancelled' in result && result.cancelled) {
          onClose();
          return;
        }
        if ('error' in result) {
          setErrorMessage(t('import.invalidZip'));
          setStep('error');
          return;
        }
        setZipPreview(result as ZipPreviewResult);
        setStep('zip-review');
      })
      .catch(err => {
        setErrorMessage(err instanceof Error ? err.message : String(err));
        setStep('error');
      })
      .finally(() => setIsExecuting(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Focus first focusable element when step changes
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const el = modalRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), input:not([disabled])'
      );
      el?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [step, isOpen]);

  const handleClose = useCallback(() => {
    if (step !== 'result') {
      window.electronAPI.importCancel().catch(() => undefined);
    }
    onClose();
  }, [step, onClose]);

  // ── ZIP execute ──────────────────────────────────────────────────────────────

  const handleZipExecute = useCallback(async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setErrorMessage(null);
    try {
      const result = await window.electronAPI.importZipExecute({
        locale: 'es',
        skipDuplicates,
      });
      setZipResult(result);
      if (!skipDuplicates && result.duplicates.length > 0) {
        setPendingDuplicates(result.duplicates);
        setDuplicateSelections(new Set(result.duplicates.map(d => d.rowIndex)));
        setStep('duplicate-review');
      } else {
        setStep('result');
        if (result.imported > 0) onImportComplete();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsExecuting(false);
    }
  }, [skipDuplicates, isExecuting, onImportComplete]);

  // ── Duplicate review ─────────────────────────────────────────────────────────

  const handleDuplicateReviewDone = useCallback(() => {
    if (zipResult && zipResult.imported > 0) onImportComplete();
    setStep('result');
  }, [zipResult, onImportComplete]);

  // ── Derived result values ────────────────────────────────────────────────────

  const imported = zipResult?.imported ?? 0;
  const skipped = zipResult?.skipped ?? 0;
  const errors: RowError[] = zipResult?.errors ?? [];

  // ── Render ───────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  const stepNum = STEP_NUMBERS[step];
  const stepHeading = t(stepHeadingKey(step));

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        ref={modalRef}
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-dialog-title"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '560px', width: '90vw' }}
      >
        {/* Accessible live region for step transitions */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {stepHeading}
        </div>

        <p className="import-step-indicator">
          {t('import.stepN', { n: stepNum, total: TOTAL_STEPS })}
        </p>

        <h2 id="import-dialog-title">{t('import.title')}</h2>

        {errorMessage && (
          <p style={{ color: 'var(--error-red, #8B1A1A)', fontFamily: 'var(--font-ui)', fontSize: '0.8rem', margin: '0.5rem 0' }}>
            {errorMessage}
          </p>
        )}

        {/* ── Loading ── */}
        {(step === 'loading' || (step === 'error' && isExecuting)) && (
          <div className="import-executing" style={{ marginTop: '1.5rem' }}>
            {t('scriptorium.indexing')}
          </div>
        )}

        {/* ── Error (file picker cancelled via error, not cancel) ── */}
        {step === 'error' && !isExecuting && (
          <div style={{ marginTop: '1.5rem' }}>
            <div className="modal-actions">
              <button type="button" className="btn-minimal" onClick={handleClose}>
                {t('detail.confirm.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* ── ZIP review ── */}
        {step === 'zip-review' && zipPreview && (
          <div style={{ marginTop: '1.25rem' }}>
            <div className="import-zip-meta">
              <div>
                <div className="import-zip-meta-label">Coins</div>
                {zipPreview.coinCount}
              </div>
              <div>
                <div className="import-zip-meta-label">Export Date</div>
                {zipPreview.exportDate ? new Date(zipPreview.exportDate).toLocaleDateString() : '—'}
              </div>
              <div>
                <div className="import-zip-meta-label">Images included</div>
                {zipPreview.hasImages ? 'Yes' : 'No'}
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-ui)', fontSize: '0.8rem', cursor: 'pointer', marginBottom: '1rem' }}>
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={e => setSkipDuplicates(e.target.checked)}
              />
              {t('import.skipDuplicates')}
            </label>

            {isExecuting && <div className="import-executing">{t('scriptorium.indexing')}</div>}

            <div className="modal-actions">
              <button type="button" className="btn-minimal" onClick={handleClose}>
                {t('detail.confirm.cancel')}
              </button>
              <button
                type="button"
                className="btn-action"
                disabled={isExecuting}
                onClick={handleZipExecute}
              >
                {t('import.confirmButton')}
              </button>
            </div>
          </div>
        )}

        {/* ── Duplicate review ── */}
        {step === 'duplicate-review' && (
          <div style={{ marginTop: '1.25rem' }}>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {t('import.reviewDuplicates')} ({pendingDuplicates.length})
            </p>

            <div style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '1rem' }}>
              {pendingDuplicates.map(d => (
                <div key={d.rowIndex} className="import-duplicate-row">
                  <input
                    type="checkbox"
                    id={`dup-${d.rowIndex}`}
                    checked={duplicateSelections.has(d.rowIndex)}
                    onChange={e => {
                      setDuplicateSelections(prev => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(d.rowIndex);
                        else next.delete(d.rowIndex);
                        return next;
                      });
                    }}
                  />
                  <label htmlFor={`dup-${d.rowIndex}`}>
                    {t('import.duplicate', {
                      row: d.rowIndex,
                      title: d.title,
                      existing: d.title,
                      id: d.existingId,
                    })}
                  </label>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-minimal" onClick={handleDuplicateReviewDone}>
                {t('detail.confirm.cancel')}
              </button>
              <button type="button" className="btn-action" onClick={handleDuplicateReviewDone}>
                {t('import.result')}
              </button>
            </div>
          </div>
        )}

        {/* ── Result ── */}
        {step === 'result' && (
          <div style={{ marginTop: '1.25rem' }}>
            <p className="import-result-summary">
              {t('import.resultSummary', { imported, skipped, errors: errors.length })}
            </p>

            {imported > 0 && (
              <p className="import-result-advisory">{t('import.newIdsAssigned')}</p>
            )}

            {errors.length > 0 && (
              <details className="import-error-details">
                <summary>{t('import.showErrors')} ({errors.length})</summary>
                <ul className="import-error-list">
                  {errors.map(e => (
                    <li key={e.rowIndex}>Row {e.rowIndex}: {e.message}</li>
                  ))}
                </ul>
              </details>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-action"
                onClick={() => {
                  if (imported > 0) onImportComplete();
                  onClose();
                }}
              >
                {t('detail.confirm.done')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

ImportDialog.displayName = 'ImportDialog';
