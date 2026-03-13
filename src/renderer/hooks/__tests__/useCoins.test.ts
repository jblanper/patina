import { renderHook, act } from '@testing-library/react';
import { useCoins } from '../useCoins';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Coin } from '../../../common/types';

const MOCK_COINS: Coin[] = [
  {
    id: 1,
    title: 'Athens Owl',
    era: 'Ancient',
    metal: 'Silver',
    year_numeric: -440,
    created_at: '2026-03-12'
  },
  {
    id: 2,
    title: 'Gold Ducat',
    era: 'Medieval',
    metal: 'Gold',
    year_numeric: 1284,
    created_at: '2026-03-12'
  }
];

describe('useCoins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window.electronAPI.getCoins as any).mockResolvedValue(MOCK_COINS);
  });

  it('should fetch coins on mount', async () => {
    const { result } = renderHook(() => useCoins());
    
    // Initial loading state
    expect(result.current.loading).toBe(true);

    // Wait for state update
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.coins).toEqual(MOCK_COINS);
    expect(result.current.filteredCoins).toEqual(MOCK_COINS);
  });

  it('should filter by era', async () => {
    const { result } = renderHook(() => useCoins());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    act(() => {
      result.current.updateFilters({ era: ['Ancient'] });
    });

    expect(result.current.filteredCoins).toHaveLength(1);
    expect(result.current.filteredCoins[0].title).toBe('Athens Owl');
  });

  it('should filter by search term', async () => {
    const { result } = renderHook(() => useCoins());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    act(() => {
      result.current.updateFilters({ searchTerm: 'gold' });
    });

    // Wait for debounce (300ms)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 400));
    });

    expect(result.current.filteredCoins).toHaveLength(1);
    expect(result.current.filteredCoins[0].title).toBe('Gold Ducat');
  });

  it('should sort by year_numeric', async () => {
    const { result } = renderHook(() => useCoins());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Default sort is year_numeric ascending
    expect(result.current.filteredCoins[0].year_numeric).toBe(-440);
    expect(result.current.filteredCoins[1].year_numeric).toBe(1284);

    act(() => {
      result.current.updateFilters({ sortAsc: false });
    });

    expect(result.current.filteredCoins[0].year_numeric).toBe(1284);
    expect(result.current.filteredCoins[1].year_numeric).toBe(-440);
  });
});
