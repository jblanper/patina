import { useState, useEffect, useCallback, useRef } from 'react';
import type { VocabField } from '../../common/validation';

interface UseVocabulariesReturn {
  options: string[];
  isLoading: boolean;
  error: string | null;
  addVocabulary: (value: string) => Promise<void>;
  incrementUsage: (value: string) => void;
  resetVocabularies: () => Promise<void>;
}

// Simple in-memory cache keyed by field name
const cache = new Map<VocabField, string[]>();

/** Clears the vocabulary cache — use in tests only. */
export function clearVocabCache(field?: VocabField) {
  if (field) {
    cache.delete(field);
  } else {
    cache.clear();
  }
}

export function useVocabularies(field: VocabField): UseVocabulariesReturn {
  const [options, setOptions] = useState<string[]>(() => cache.get(field) ?? []);
  const [isLoading, setIsLoading] = useState(!cache.has(field));
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchOptions = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.getVocab(field);
      if (!isMounted.current) return;
      cache.set(field, result);
      setOptions(result);
      setError(null);
    } catch (err) {
      if (!isMounted.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load vocabulary');
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [field]);

  useEffect(() => {
    if (!cache.has(field)) {
      fetchOptions();
    } else {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field]);

  const addVocabulary = useCallback(
    async (value: string) => {
      await window.electronAPI.addVocabEntry(field, value);
      cache.delete(field);
      await fetchOptions();
    },
    [field, fetchOptions],
  );

  const incrementUsage = useCallback(
    (value: string) => {
      window.electronAPI.incrementVocabUsage(field, value);
    },
    [field],
  );

  const resetVocabularies = useCallback(async () => {
    try {
      await window.electronAPI.resetVocab(field);
      cache.delete(field);
      await fetchOptions();
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to reset vocabulary');
      }
    }
  }, [field, fetchOptions]);

  return { options, isLoading, error, addVocabulary, incrementUsage, resetVocabularies };
}
