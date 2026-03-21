import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLanguage } from '../useLanguage';

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

describe('useLanguage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes current language from i18n', () => {
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language).toBe('es');
  });

  it('switchLanguage calls i18n.changeLanguage', async () => {
    const { result } = renderHook(() => useLanguage());
    await act(async () => {
      await result.current.switchLanguage('en');
    });
    expect(mockChangeLanguage).toHaveBeenCalledWith('en');
  });

  it('switchLanguage calls setPreference with the new language', async () => {
    const { result } = renderHook(() => useLanguage());
    await act(async () => {
      await result.current.switchLanguage('en');
    });
    expect(window.electronAPI.setPreference).toHaveBeenCalledWith('language', 'en');
  });

  it('switchLanguage does not throw if setPreference fails', async () => {
    vi.mocked(window.electronAPI.setPreference).mockRejectedValueOnce(new Error('IPC error'));
    const { result } = renderHook(() => useLanguage());
    await expect(act(async () => {
      await result.current.switchLanguage('en');
    })).resolves.not.toThrow();
  });
});
