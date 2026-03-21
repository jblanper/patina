import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LanguageSelector } from './LanguageSelector';

const mockChangeLanguage = vi.fn().mockResolvedValue(undefined);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: mockChangeLanguage,
      language: 'es',
    },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

describe('LanguageSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChangeLanguage.mockResolvedValue(undefined);
  });

  it('renders ES and EN buttons', () => {
    render(<LanguageSelector />);
    expect(screen.getByRole('button', { name: /ES/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /EN/i })).toBeInTheDocument();
  });

  it('marks ES as active when language is es', () => {
    render(<LanguageSelector />);
    const esBtn = screen.getByRole('button', { name: /ES/i });
    expect(esBtn).toHaveClass('active');
    const enBtn = screen.getByRole('button', { name: /EN/i });
    expect(enBtn).not.toHaveClass('active');
  });

  it('calls setPreference when switching to EN', async () => {
    render(<LanguageSelector />);
    fireEvent.click(screen.getByRole('button', { name: /EN/i }));
    await waitFor(() => {
      expect(window.electronAPI.setPreference).toHaveBeenCalledWith('language', 'en');
    });
  });

  it('calls setPreference when switching to ES', async () => {
    render(<LanguageSelector />);
    fireEvent.click(screen.getByRole('button', { name: /ES/i }));
    await waitFor(() => {
      expect(window.electronAPI.setPreference).toHaveBeenCalledWith('language', 'es');
    });
  });
});
