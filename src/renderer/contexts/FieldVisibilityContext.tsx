import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { FieldVisibilityMap } from '../../common/types';
import { DEFAULT_FIELD_VISIBILITY, LOCKED_VISIBILITY_KEYS, type VisibilityKey } from '../../common/validation';

interface FieldVisibilityContextValue {
  visibility:      FieldVisibilityMap;
  isVisible:       (key: VisibilityKey) => boolean;
  setVisibility:   (key: VisibilityKey, visible: boolean) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

export const FieldVisibilityContext =
  createContext<FieldVisibilityContextValue | null>(null);

export const FieldVisibilityProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [visibility, setVisibilityState] = useState<FieldVisibilityMap>(
    { ...DEFAULT_FIELD_VISIBILITY }
  );

  // Load persisted preferences on mount — single IPC call, cached for the session
  useEffect(() => {
    window.electronAPI.prefsGetVisibility().then(setVisibilityState);
  }, []);

  const setVisibility = useCallback(async (key: VisibilityKey, visible: boolean) => {
    if (LOCKED_VISIBILITY_KEYS.has(key)) return;
    // Optimistic update first — UI reacts immediately, IPC follows
    setVisibilityState(prev => ({ ...prev, [key]: visible }));
    await window.electronAPI.prefsSetVisibility(key, visible);
  }, []);

  const resetToDefaults = useCallback(async () => {
    const fresh = await window.electronAPI.prefsResetVisibility();
    setVisibilityState(fresh);
  }, []);

  const isVisible = useCallback(
    (key: VisibilityKey) => visibility[key] ?? true,
    [visibility]
  );

  return (
    <FieldVisibilityContext.Provider
      value={{ visibility, isVisible, setVisibility, resetToDefaults }}
    >
      {children}
    </FieldVisibilityContext.Provider>
  );
};

export const useFieldVisibility = () => {
  const ctx = useContext(FieldVisibilityContext);
  if (!ctx) throw new Error('useFieldVisibility must be used within FieldVisibilityProvider');
  return ctx;
};
