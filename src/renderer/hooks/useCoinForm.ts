import { useState, useEffect, useCallback } from 'react';
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
  era: 'Ancient',
  images: {}
};

export function useCoinForm(initialCoin?: Coin | null, existingImages: CoinImage[] = []) {
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
      const { id, created_at, ...rest } = initialCoin;
      return { ...rest, images: {} }; // Images will be handled separately
    }
    
    return DEFAULT_STATE;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [existingImagePaths] = useState<Set<string>>(
    () => new Set(existingImages.map(img => img.path))
  );

  // Sync formData when initialCoin changes (for Edit mode)
  useEffect(() => {
    if (initialCoin) {
      const { id, created_at, ...rest } = initialCoin;
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

  const updateField = useCallback((field: keyof NewCoin, value: any) => {
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
    const { images, ...coinData } = formData;
    const result = NewCoinSchema.safeParse(coinData);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        const path = issue.path[0] as string;
        newErrors[path] = issue.message;
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
    updateField,
    updateImage,
    submit,
    clearDraft,
    setFormData // For loading existing coin images if needed
  };
}
