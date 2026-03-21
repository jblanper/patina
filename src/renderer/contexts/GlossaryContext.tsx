import React, { useContext } from 'react';
import { UseGlossaryDrawer } from '../hooks/useGlossaryDrawer';

export const GlossaryContext = React.createContext<UseGlossaryDrawer | null>(null);

export const useGlossaryContext = (): UseGlossaryDrawer => {
  const ctx = useContext(GlossaryContext);
  if (!ctx) throw new Error('useGlossaryContext must be used within GlossaryContext.Provider');
  return ctx;
};
