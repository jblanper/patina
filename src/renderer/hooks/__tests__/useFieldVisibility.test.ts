import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { FieldVisibilityProvider, useFieldVisibility } from '../../contexts/FieldVisibilityContext';
import { DEFAULT_FIELD_VISIBILITY, LOCKED_VISIBILITY_KEYS } from '../../../common/validation';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(FieldVisibilityProvider, null, children);

describe('useFieldVisibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-UFV-01: throws when used outside FieldVisibilityProvider', () => {
    // Suppress expected console.error from React
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useFieldVisibility())).toThrow(
      'useFieldVisibility must be used within FieldVisibilityProvider'
    );
    consoleSpy.mockRestore();
  });

  it('TC-UFV-02: initialises with DEFAULT_FIELD_VISIBILITY before IPC resolves', () => {
    vi.mocked(window.electronAPI.prefsGetVisibility).mockResolvedValue(
      { ...DEFAULT_FIELD_VISIBILITY }
    );

    const { result } = renderHook(() => useFieldVisibility(), { wrapper });

    // Synchronous initial state from DEFAULT_FIELD_VISIBILITY
    expect(result.current.visibility['ledger.title']).toBe(true);
    expect(result.current.visibility['ledger.die_axis']).toBe(false);
  });

  it('TC-UFV-03: loads persisted preferences from IPC on mount', async () => {
    const overriddenPrefs = {
      ...DEFAULT_FIELD_VISIBILITY,
      'ledger.die_axis': true,   // user had toggled this on
    };
    vi.mocked(window.electronAPI.prefsGetVisibility).mockResolvedValue(overriddenPrefs);

    const { result } = renderHook(() => useFieldVisibility(), { wrapper });

    await waitFor(() => {
      expect(result.current.visibility['ledger.die_axis']).toBe(true);
    });
    expect(window.electronAPI.prefsGetVisibility).toHaveBeenCalledTimes(1);
  });

  it('TC-UFV-04: isVisible() returns correct boolean for a key', async () => {
    vi.mocked(window.electronAPI.prefsGetVisibility).mockResolvedValue({
      ...DEFAULT_FIELD_VISIBILITY,
      'ledger.die_axis': false,
    });

    const { result } = renderHook(() => useFieldVisibility(), { wrapper });

    await waitFor(() => expect(window.electronAPI.prefsGetVisibility).toHaveBeenCalled());

    expect(result.current.isVisible('ledger.title')).toBe(true);
    expect(result.current.isVisible('ledger.die_axis')).toBe(false);
  });

  it('TC-UFV-05: setVisibility() applies optimistic update immediately', async () => {
    vi.mocked(window.electronAPI.prefsGetVisibility).mockResolvedValue(
      { ...DEFAULT_FIELD_VISIBILITY }
    );
    vi.mocked(window.electronAPI.prefsSetVisibility).mockResolvedValue(undefined);

    const { result } = renderHook(() => useFieldVisibility(), { wrapper });
    await waitFor(() => expect(window.electronAPI.prefsGetVisibility).toHaveBeenCalled());

    await act(async () => {
      await result.current.setVisibility('ledger.die_axis', true);
    });

    expect(result.current.visibility['ledger.die_axis']).toBe(true);
    expect(window.electronAPI.prefsSetVisibility).toHaveBeenCalledWith('ledger.die_axis', true);
  });

  it('TC-UFV-06: setVisibility() is a no-op for locked keys', async () => {
    vi.mocked(window.electronAPI.prefsGetVisibility).mockResolvedValue(
      { ...DEFAULT_FIELD_VISIBILITY }
    );

    const { result } = renderHook(() => useFieldVisibility(), { wrapper });
    await waitFor(() => expect(window.electronAPI.prefsGetVisibility).toHaveBeenCalled());

    // ledger.title is locked
    await act(async () => {
      await result.current.setVisibility('ledger.title', false);
    });

    expect(result.current.visibility['ledger.title']).toBe(true);
    expect(window.electronAPI.prefsSetVisibility).not.toHaveBeenCalled();
  });

  it('TC-UFV-07: all LOCKED_VISIBILITY_KEYS are ignored by setVisibility()', async () => {
    vi.mocked(window.electronAPI.prefsGetVisibility).mockResolvedValue(
      { ...DEFAULT_FIELD_VISIBILITY }
    );

    const { result } = renderHook(() => useFieldVisibility(), { wrapper });
    await waitFor(() => expect(window.electronAPI.prefsGetVisibility).toHaveBeenCalled());

    for (const key of LOCKED_VISIBILITY_KEYS) {
      await act(async () => {
        await result.current.setVisibility(key, false);
      });
    }

    expect(window.electronAPI.prefsSetVisibility).not.toHaveBeenCalled();
  });

  it('TC-UFV-08: resetToDefaults() calls prefsResetVisibility and updates state', async () => {
    const resetResult = { ...DEFAULT_FIELD_VISIBILITY };
    vi.mocked(window.electronAPI.prefsGetVisibility).mockResolvedValue(
      { ...DEFAULT_FIELD_VISIBILITY, 'ledger.die_axis': true }
    );
    vi.mocked(window.electronAPI.prefsResetVisibility).mockResolvedValue(resetResult);

    const { result } = renderHook(() => useFieldVisibility(), { wrapper });
    await waitFor(() => expect(window.electronAPI.prefsGetVisibility).toHaveBeenCalled());

    await act(async () => {
      await result.current.resetToDefaults();
    });

    expect(window.electronAPI.prefsResetVisibility).toHaveBeenCalledTimes(1);
    expect(result.current.visibility['ledger.die_axis']).toBe(false);
  });
});
