import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useVocabularies, clearVocabCache } from '../useVocabularies';

const mockGetVocab = window.electronAPI.getVocab as ReturnType<typeof vi.fn>;
const mockAddVocabEntry = window.electronAPI.addVocabEntry as ReturnType<typeof vi.fn>;
const mockIncrementVocabUsage = window.electronAPI.incrementVocabUsage as ReturnType<typeof vi.fn>;
const mockResetVocab = window.electronAPI.resetVocab as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  clearVocabCache();
});

describe('useVocabularies — initial load', () => {
  it('TC-UV-01: loads vocabularies on mount; isLoading true then false', async () => {
    mockGetVocab.mockResolvedValueOnce(['Silver', 'Gold']);

    const { result } = renderHook(() => useVocabularies('metal'));

    // Initially loading (cache is empty for 'metal' in this test)
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.options).toEqual(['Silver', 'Gold']);
    expect(result.current.error).toBeNull();
  });

  it('TC-UV-02: returns empty array when no vocabularies exist; no error', async () => {
    mockGetVocab.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useVocabularies('denomination'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.options).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});

describe('useVocabularies — addVocabulary', () => {
  it('TC-UV-05: calls addVocabEntry with correct { field, value }', async () => {
    mockGetVocab.mockResolvedValue(['Silver']);
    mockAddVocabEntry.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useVocabularies('metal'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addVocabulary('Electrum');
    });

    expect(mockAddVocabEntry).toHaveBeenCalledWith('metal', 'Electrum');
  });

  it('TC-UV-06: triggers a refresh of the vocabulary list after successful add', async () => {
    mockGetVocab
      .mockResolvedValueOnce(['Silver'])
      .mockResolvedValueOnce(['Silver', 'Electrum']);
    mockAddVocabEntry.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useVocabularies('grade'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addVocabulary('Electrum');
    });

    await waitFor(() => expect(result.current.options).toContain('Electrum'));
    expect(mockGetVocab).toHaveBeenCalledTimes(2);
  });

  it('TC-UV-07: does not mutate state optimistically before API resolves', async () => {
    mockGetVocab.mockResolvedValue(['Silver']);
    let resolveAdd!: () => void;
    mockAddVocabEntry.mockImplementationOnce(
      () => new Promise<void>(resolve => { resolveAdd = resolve; })
    );

    const { result } = renderHook(() => useVocabularies('era'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const optionsBefore = result.current.options;

    // Start the add but don't resolve yet
    act(() => { result.current.addVocabulary('NewEra'); });

    // Options should not have changed yet
    expect(result.current.options).toEqual(optionsBefore);

    // Resolve and wait for refresh
    mockGetVocab.mockResolvedValueOnce(['Silver', 'NewEra']);
    act(() => resolveAdd());
    await waitFor(() => expect(result.current.options).toContain('NewEra'));
  });
});

describe('useVocabularies — incrementUsage', () => {
  it('TC-UV-08: calls incrementVocabUsage with { field, value }', async () => {
    mockGetVocab.mockResolvedValue(['Silver', 'Gold']);

    const { result } = renderHook(() => useVocabularies('mint'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.incrementUsage('Silver'); });

    expect(mockIncrementVocabUsage).toHaveBeenCalledWith('mint', 'Silver');
  });

  it('TC-UV-09: does not update options state or trigger re-fetch (fire-and-forget)', async () => {
    mockGetVocab.mockResolvedValue(['Silver']);

    const { result } = renderHook(() => useVocabularies('die_axis'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const callCountBefore = mockGetVocab.mock.calls.length;

    act(() => { result.current.incrementUsage('Silver'); });

    expect(mockGetVocab.mock.calls.length).toBe(callCountBefore);
  });
});

describe('useVocabularies — resetVocabularies', () => {
  it('TC-UV-12: calls resetVocab with the field bound to the hook', async () => {
    mockGetVocab.mockResolvedValue(['Silver']);
    mockResetVocab.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useVocabularies('metal'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.resetVocabularies();
    });

    expect(mockResetVocab).toHaveBeenCalledWith('metal');
  });

  it('TC-UV-13: triggers a refresh of the vocabulary list after reset', async () => {
    mockGetVocab
      .mockResolvedValueOnce(['Silver', 'CustomMetal'])
      .mockResolvedValueOnce(['Silver']);
    mockResetVocab.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useVocabularies('denomination'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.resetVocabularies();
    });

    await waitFor(() => expect(result.current.options).not.toContain('CustomMetal'));
    expect(mockGetVocab).toHaveBeenCalledTimes(2);
  });

  it('TC-UV-14: sets error and leaves list unchanged when resetVocab rejects', async () => {
    mockGetVocab.mockResolvedValue(['Silver']);
    mockResetVocab.mockRejectedValueOnce(new Error('Reset failed'));

    const { result } = renderHook(() => useVocabularies('grade'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const optionsBefore = result.current.options;

    await act(async () => {
      await result.current.resetVocabularies();
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.options).toEqual(optionsBefore);
  });
});

describe('useVocabularies — error handling', () => {
  it('TC-UV-15: sets error and clears isLoading when getVocab rejects', async () => {
    mockGetVocab.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useVocabularies('era'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.options).toEqual([]);
  });

  it('TC-UV-16: sets error and leaves list unchanged when addVocabEntry rejects', async () => {
    mockGetVocab.mockResolvedValue(['Silver']);
    mockAddVocabEntry.mockRejectedValueOnce(new Error('Add failed'));

    const { result } = renderHook(() => useVocabularies('metal'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => { await result.current.addVocabulary('Bad'); })
    ).rejects.toThrow('Add failed');
  });
});
