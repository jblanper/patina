import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { VocabField } from '../../common/validation';
import { AutocompleteField } from './AutocompleteField';
import { useVocabularies } from '../hooks/useVocabularies';
import { ExportToast } from './ExportToast';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: number[];
  onComplete: () => void;
}

const BULK_EDIT_FIELDS: VocabField[] = [
  'metal',
  'grade',
  'era',
  'denomination',
  'mint',
  'die_axis',
  'rarity',
];

// Inner component that renders when a field is selected — uses the vocab hook
interface FieldValuePickerProps {
  field: VocabField;
  value: string;
  onChange: (val: string) => void;
}

const FieldValuePicker: React.FC<FieldValuePickerProps> = ({ field, value, onChange }) => {
  const { options, addVocabulary, incrementUsage } = useVocabularies(field);

  return (
    <AutocompleteField
      field={field}
      value={value}
      onChange={onChange}
      onAddNew={addVocabulary}
      onIncrementUsage={incrementUsage}
      options={options}
    />
  );
};

export const BulkEditModal: React.FC<BulkEditModalProps> = ({
  isOpen,
  onClose,
  selectedIds,
  onComplete,
}) => {
  const { t } = useTranslation();
  const [selectedField, setSelectedField] = useState<VocabField | ''>('');
  const [fieldValue, setFieldValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedField('');
      setFieldValue('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Move focus to the AutocompleteField input when a field is selected (step transition)
  useEffect(() => {
    if (!selectedField) return;
    const timer = setTimeout(() => {
      modalRef.current?.querySelector<HTMLInputElement>('.autocomplete-input')?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [selectedField]);

  const isConfirmDisabled = !selectedField || !fieldValue.trim() || isSubmitting;

  const handleConfirm = useCallback(async () => {
    if (isConfirmDisabled) return;
    if (!selectedField) return;

    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedIds) {
      try {
        await window.electronAPI.updateCoin(id, { [selectedField]: fieldValue });
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setIsSubmitting(false);

    if (errorCount > 0) {
      setToastMessage(`${t('cabinet.bulkEditSuccess', { count: successCount })}. ${errorCount} error(s).`);
      setToastType('error');
    } else {
      setToastMessage(t('cabinet.bulkEditSuccess', { count: successCount }));
      setToastType('success');
    }
    setToastVisible(true);
    onComplete();
    onClose();
  }, [isConfirmDisabled, selectedField, fieldValue, selectedIds, t, onComplete, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          ref={modalRef}
          className="modal-content"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-edit-modal-title"
          onClick={e => e.stopPropagation()}
        >
          <h2 id="bulk-edit-modal-title">
            {t('cabinet.bulkEditTitle', { count: selectedIds.length })}
          </h2>

          <div style={{ marginTop: '1.25rem' }}>
            {/* Step 1: Field selection */}
            <label className="form-label" htmlFor="bulk-edit-field-select">
              {t('cabinet.bulkEditFieldLabel')}
            </label>
            <select
              id="bulk-edit-field-select"
              className="modal-select"
              value={selectedField}
              onChange={e => {
                setSelectedField(e.target.value as VocabField | '');
                setFieldValue('');
              }}
            >
              <option value="">—</option>
              {BULK_EDIT_FIELDS.map(f => (
                <option key={f} value={f}>
                  {t(`ledger.${f === 'die_axis' ? 'dieAxis' : f}`)}
                </option>
              ))}
            </select>

            {/* Step 2: Value entry — only shown when field is selected */}
            {selectedField && (
              <div style={{ marginTop: '1rem' }}>
                <FieldValuePicker
                  field={selectedField}
                  value={fieldValue}
                  onChange={setFieldValue}
                />
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-minimal"
              onClick={onClose}
            >
              {t('detail.confirm.cancel')}
            </button>
            <button
              type="button"
              className="btn-action"
              aria-disabled={isConfirmDisabled}
              onClick={handleConfirm}
            >
              {isSubmitting
                ? t('scriptorium.indexing')
                : t('cabinet.bulkEditConfirm', { count: selectedIds.length })}
            </button>
          </div>
        </div>
      </div>

      <ExportToast
        isVisible={toastVisible}
        type={toastType}
        message={toastMessage}
        onDismiss={() => setToastVisible(false)}
      />
    </>
  );
};

BulkEditModal.displayName = 'BulkEditModal';
