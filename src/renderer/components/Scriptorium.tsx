import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCoin } from '../hooks/useCoin';
import { useCoinForm } from '../hooks/useCoinForm';
import { PlateEditor } from './PlateEditor';
import { LedgerForm } from './LedgerForm';

export const Scriptorium: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { coin, images: existingImages, isLoading } = useCoin(id);
  
  const { 
    formData, 
    errors, 
    isSaving, 
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
    const success = await submit();
    if (success) {
      navigate('/');
    }
  };

  if (id && isLoading) {
    return (
      <div className="ledger-layout">
        <div className="loading-state">Consulting the archives...</div>
      </div>
    );
  }

  return (
    <div className="scriptorium-container">
      <header className="app-header">
        <button className="nav-back" onClick={() => navigate(-1)}>
          ← Close Ledger Entry
        </button>
        <div className="header-actions">
          <span className="draft-status">
            {isSaving ? 'Indexing...' : 'Draft Preserved'}
          </span>
          <button 
            className="btn-solid" 
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {id ? 'Update Ledger' : 'Index to Ledger'}
          </button>
        </div>
      </header>

      <div className="ledger-layout">
        <PlateEditor 
          images={formData.images} 
          onImageCaptured={updateImage} 
        />
        <LedgerForm 
          formData={formData} 
          errors={errors} 
          updateField={updateField} 
        />
      </div>
    </div>
  );
};

