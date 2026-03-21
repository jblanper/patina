import { useState, useCallback, useEffect, useRef } from 'react';

export interface GlossaryDrawerState {
  open: boolean;
  field: string | null;
}

export interface UseGlossaryDrawer {
  drawerState: GlossaryDrawerState;
  openField: (fieldId: string) => void;
  openIndex: () => void;
  close: () => void;
}

export const useGlossaryDrawer = (): UseGlossaryDrawer => {
  const [drawerState, setDrawerState] = useState<GlossaryDrawerState>({
    open: false,
    field: null,
  });

  const triggerRef = useRef<HTMLElement | null>(null);

  const openField = useCallback((fieldId: string) => {
    triggerRef.current = document.activeElement as HTMLElement;
    setDrawerState({ open: true, field: fieldId });
  }, []);

  const openIndex = useCallback(() => {
    triggerRef.current = document.activeElement as HTMLElement;
    setDrawerState({ open: true, field: null });
  }, []);

  const close = useCallback(() => {
    setDrawerState({ open: false, field: null });
    // Return focus to the element that triggered the drawer
    setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  // Global '?' keyboard shortcut — fires openIndex when not in a text field
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '?') openIndex();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openIndex]);

  return { drawerState, openField, openIndex, close };
};
