import React, { useEffect } from 'react';
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
    submitError,
    clearError,
    updateField,
    updateImage,
    submit,
    setFormData
  } = useCoinForm(coin, existingImages);

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

  const handleSubmit = async () => {
    clearError();
    const success = await submit();
    if (success) {
      navigate('/');
    }
  };

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
        <button className="nav-back" onClick={() => navigate(-1)}>
          {t('scriptorium.closeEntry')}
        </button>
        <div className="header-actions">
          <span className="draft-status">
            {isSaving ? t('scriptorium.indexing') : t('scriptorium.draftPreserved')}
          </span>
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
        />
        <LedgerForm
          formData={formData}
          errors={errors}
          updateField={updateField}
          coinId={coin?.id}
        />
      </div>
    </div>
  );
};
