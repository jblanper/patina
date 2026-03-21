import { useState, useEffect, useCallback, useRef } from 'react';
import type { VocabField } from '../../common/validation';
import { useLanguage } from './useLanguage';

interface UseVocabulariesReturn {
  options: string[];
  isLoading: boolean;
  error: string | null;
  addVocabulary: (value: string) => Promise<void>;
  incrementUsage: (value: string) => void;
  resetVocabularies: () => Promise<void>;
}

// Module-level cache — composite key prevents stale locale entries
const cache = new Map<string, string[]>();

/** Clears the vocabulary cache for a field (all locales) or entirely. */
export function clearVocabCache(field?: VocabField) {
  if (field) {
    for (const key of cache.keys()) {
      if (key.startsWith(`${field}:`)) cache.delete(key);
    }
  } else {
    cache.clear();
  }
}

export function useVocabularies(field: VocabField): UseVocabulariesReturn {
  const { language } = useLanguage();
  const cacheKey = `${field}:${language}`;

  const [options, setOptions] = useState<string[]>(() => cache.get(cacheKey) ?? []);
  const [isLoading, setIsLoading] = useState(!cache.has(cacheKey));
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchOptions = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.getVocab(field, language);
      if (!isMounted.current) return;
      cache.set(cacheKey, result);
      setOptions(result);
      setError(null);
    } catch (err) {
      if (!isMounted.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load vocabulary');
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [field, language, cacheKey]);

  useEffect(() => {
    if (!cache.has(cacheKey)) {
      fetchOptions();
    } else {
      setOptions(cache.get(cacheKey)!);
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field, language, cacheKey]);

  const addVocabulary = useCallback(
    async (value: string) => {
      await window.electronAPI.addVocabEntry(field, value);
      clearVocabCache(field);
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
      clearVocabCache(field);
      await fetchOptions();
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to reset vocabulary');
      }
    }
  }, [field, fetchOptions]);

  return { options, isLoading, error, addVocabulary, incrementUsage, resetVocabularies };
}
