import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCoin } from '../hooks/useCoin';
import { useCoinForm } from '../hooks/useCoinForm';
import { PlateEditor } from './PlateEditor';
import { LedgerForm } from './LedgerForm';

export const Scriptorium: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { coin, images: existingImages, isLoading } = useCoin(id);

  const {
    formData,
    errors,
    isSaving,
    isDirty,
    imagesChanged,
    submitError,
    clearError,
    updateField,
    updateImage,
    submit,
    clearDraft,
    setFormData
  } = useCoinForm(coin, existingImages);

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Sync existing images when editing
  useEffect(() => {
    if (coin && existingImages.length > 0) {
      const imageMap: Partial<Record<'obverse' | 'reverse' | 'edge', string>> = {};
      existingImages.forEach(img => {
        const label = img.label?.toLowerCase();
        if (label === 'obverse' || label === 'reverse' || label === 'edge') {
          imageMap[label as 'obverse' | 'reverse' | 'edge'] = img.path;
        }
      });

      setFormData(prev => ({
        ...prev,
        images: { ...prev.images, ...imageMap }
      }));
    }
  }, [coin, existingImages, setFormData]);

  const handleImageCleared = useCallback((slot: 'obverse' | 'reverse' | 'edge') => {
    updateImage(slot, '');
  }, [updateImage]);

  const handleSubmit = async () => {
    clearError();
    const success = await submit();
    if (success) {
      navigate('/');
    }
  };

  // F-04: guard back-navigation when there are unsaved changes
  const handleClose = () => {
    if (id && (isDirty || imagesChanged)) {
      setShowLeaveConfirm(true);
    } else {
      navigate(-1);
    }
  };

  // F-05: check if add-mode form has any user-entered content
  const isFormPopulated = Object.entries(formData).some(
    ([k, v]) => k !== 'images' && v !== '' && v !== null && v !== undefined
  );

  if (id && isLoading) {
    return (
      <div className="ledger-layout">
        <div className="loading-state">{t('scriptorium.loading')}</div>
      </div>
    );
  }

  return (
    <div className="scriptorium-container">
      <header className="app-header">
        <button className="nav-back" onClick={handleClose}>
          {t('scriptorium.closeEntry')}
        </button>
        <div className="header-actions">
          {/* F-03: show context-appropriate status label */}
          {!id && (
            <span className="draft-status">
              {isSaving ? t('scriptorium.indexing') : t('scriptorium.draftPreserved')}
            </span>
          )}
          {id && !isSaving && (
            <span className="draft-status">{t('scriptorium.editingRecord')}</span>
          )}
          {id && isSaving && (
            <span className="draft-status">{t('scriptorium.indexing')}</span>
          )}
          {/* F-05: discard draft button in add mode */}
          {!id && isFormPopulated && (
            <button className="btn-ghost" onClick={() => setShowDiscardConfirm(true)}>
              {t('scriptorium.discardDraft')}
            </button>
          )}
          <button
            className="btn-solid"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {id ? t('scriptorium.updateLedger') : t('scriptorium.indexToLedger')}
          </button>
        </div>
      </header>

      {submitError && (
        <div className="submission-error" role="alert">
          <span>{submitError}</span>
          <button className="submission-error-dismiss" onClick={clearError} aria-label={t('scriptorium.dismissError')}>×</button>
        </div>
      )}

      <div className="ledger-layout">
        <PlateEditor
          images={formData.images}
          onImageCaptured={updateImage}
          onImageCleared={handleImageCleared}
        />
        <LedgerForm
          formData={formData}
          errors={errors}
          updateField={updateField}
          coinId={coin?.id}
        />
      </div>

      {/* F-04: unsaved changes confirmation modal */}
      {showLeaveConfirm && (
        <div className="modal-overlay" onClick={() => setShowLeaveConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{t('scriptorium.leaveConfirm.title')}</h2>
            <p>{t('scriptorium.leaveConfirm.message')}</p>
            <div className="modal-actions">
              <button className="btn-minimal" onClick={() => setShowLeaveConfirm(false)}>
                {t('scriptorium.leaveConfirm.cancel')}
              </button>
              <button className="btn-delete" onClick={() => navigate(-1)}>
                {t('scriptorium.leaveConfirm.discard')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* F-05: discard draft confirmation modal */}
      {showDiscardConfirm && (
        <div className="modal-overlay" onClick={() => setShowDiscardConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{t('scriptorium.discardConfirm.title')}</h2>
            <p>{t('scriptorium.discardConfirm.message')}</p>
            <div className="modal-actions">
              <button className="btn-minimal" onClick={() => setShowDiscardConfirm(false)}>
                {t('scriptorium.discardConfirm.cancel')}
              </button>
              <button className="btn-delete" onClick={() => { clearDraft(); setShowDiscardConfirm(false); }}>
                {t('scriptorium.discardConfirm.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
