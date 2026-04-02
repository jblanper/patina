import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { NewCoin, Coin, CoinImage } from '../../common/types';
import { NewCoinSchema } from '../../common/validation';

interface CoinFormState extends NewCoin {
  images: {
    obverse?: string;
    reverse?: string;
    edge?: string;
  };
}

const DEFAULT_STATE: CoinFormState = {
  title: '',
  era: '',
  images: {}
};

const FIELD_ERROR_KEYS: Record<string, string> = {
  title: 'validation.title',
  era:   'validation.era',
};

export function useCoinForm(initialCoin?: Coin | null, existingImages: CoinImage[] = []) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CoinFormState>(() => {
    // Try to load from auto-draft if no initial coin
    if (!initialCoin) {
      const draft = localStorage.getItem('patina_scriptorium_draft');
      if (draft) {
        try {
          return JSON.parse(draft);
        } catch (e) {
          console.error('Failed to parse draft:', e);
        }
      }
    }
    
    if (initialCoin) {
      const { id: _id, created_at: _created_at, ...rest } = initialCoin;
      return { ...rest, images: {} }; // Images will be handled separately
    }
    
    return DEFAULT_STATE;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // F-04: isDirty — true when edit-mode form data differs from initial coin snapshot
  const isDirty = useMemo(() => {
    if (!initialCoin) return false;
    const { id: _id, created_at: _created_at, ...initial } = initialCoin;
    const { images: _images, ...current } = formData;
    return JSON.stringify(current) !== JSON.stringify(initial);
  }, [formData, initialCoin]);

  // F-04: imagesChanged — true when new images (not in existingImages) have been added
  const imagesChanged = useMemo(() => {
    if (!initialCoin) {
      return Object.keys(formData.images).length > 0;
    }
    const existingPaths = new Set(existingImages.map(img => img.path));
    return Object.values(formData.images).some(p => p && !existingPaths.has(p));
  }, [formData.images, initialCoin, existingImages]);

  const existingImagePaths = useMemo(
    () => new Set(existingImages.map(img => img.path)),
    [existingImages]
  );

  // Sync formData when initialCoin changes (for Edit mode)
  useEffect(() => {
    if (initialCoin) {
      const { id: _id, created_at: _created_at, ...rest } = initialCoin;
      setFormData(prev => ({
        ...rest,
        images: prev.images // Keep currently selected images
      }));
    }
  }, [initialCoin]);

  // Auto-draft debounced effect
  useEffect(() => {
    if (initialCoin) return; // Don't auto-draft when editing

    const timeoutId = setTimeout(() => {
      localStorage.setItem('patina_scriptorium_draft', JSON.stringify(formData));
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [formData, initialCoin]);

  const updateField = useCallback((field: keyof NewCoin, value: string | number | null | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const updateImage = useCallback((slot: 'obverse' | 'reverse' | 'edge', path: string) => {
    setFormData(prev => ({
      ...prev,
      images: { ...prev.images, [slot]: path }
    }));
  }, []);

  const validateForm = useCallback(() => {
    const { images: _images, ...coinData } = formData;
    const result = NewCoinSchema.safeParse(coinData);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        const path = issue.path[0] as string;
        newErrors[path] = FIELD_ERROR_KEYS[path] ? t(FIELD_ERROR_KEYS[path]) : issue.message;
      });
      setErrors(newErrors);
      return false;
    }
    setErrors({});
    return true;
  }, [formData]);

  const submit = useCallback(async () => {
    if (!validateForm()) return false;
    
    setIsSaving(true);
    try {
      const { images, ...coinData } = formData;
      let coinId: number;
      
      if (initialCoin) {
        await window.electronAPI.updateCoin(initialCoin.id, coinData);
        coinId = initialCoin.id;
      } else {
        coinId = await window.electronAPI.addCoin(coinData);
      }
      
      // Save images (only new ones not already in database)
      const imagePromises = Object.entries(images)
        .filter(([, path]) => path && !existingImagePaths.has(path))
        .map(([label, path], index) => {
          if (!path) return Promise.resolve();
          return window.electronAPI.addImage({
            coin_id: coinId,
            path,
            label: label.charAt(0).toUpperCase() + label.slice(1),
            is_primary: label === 'obverse',
            sort_order: index
          });
        });
      
      await Promise.all(imagePromises);
      
      // Clear draft on success
      if (!initialCoin) {
        localStorage.removeItem('patina_scriptorium_draft');
      }
      
      return true;
    } catch (err) {
      console.error('Submission failed:', err);
      setSubmitError(err instanceof Error ? err.message : 'Submission failed');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [formData, initialCoin, validateForm]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem('patina_scriptorium_draft');
    setFormData(DEFAULT_STATE);
  }, []);

  return {
    formData,
    errors,
    isSaving,
    submitError,
    isDirty,
    imagesChanged,
    clearError: () => setSubmitError(null),
    updateField,
    updateImage,
    submit,
    clearDraft,
    setFormData
  };
}
