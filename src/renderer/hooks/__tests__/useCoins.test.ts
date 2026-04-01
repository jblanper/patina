import { renderHook, act } from '@testing-library/react';
import { useCoins } from '../useCoins';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Coin } from '../../../common/types';

const coinBase = {
  era: 'Ancient' as const,
  created_at: '2026-03-12'
};

const MOCK_COINS: Coin[] = [
  {
    id: 1,
    title: 'Athens Owl',
    era: 'Ancient',
    metal: 'Silver',
    year_numeric: -440,
    purchase_date: '2025-01-15',
    created_at: '2026-03-12'
  },
  {
    id: 2,
    title: 'Gold Ducat',
    era: 'Medieval',
    metal: 'Gold',
    year_numeric: 1284,
    purchase_date: '2024-06-01',
    created_at: '2026-03-12'
  },
  {
    ...coinBase,
    id: 3,
    title: 'Sestertius of Hadrian',
    grade: 'XF',
    metal: 'Bronze',
    year_numeric: 120,
    purchase_date: '2025-11-20',
  },
  {
    ...coinBase,
    id: 4,
    title: 'Denarius of Caracalla',
    grade: 'Choice VF',
    metal: 'Silver',
    year_numeric: 210,
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
    expect(result.current.filteredCoins).toHaveLength(MOCK_COINS.length);
  });

  it('should filter by era', async () => {
    const { result } = renderHook(() => useCoins());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    act(() => {
      result.current.updateFilters({ era: ['Medieval'] });
    });

    expect(result.current.filteredCoins).toHaveLength(1);
    expect(result.current.filteredCoins[0].title).toBe('Gold Ducat');
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

    // Default sort is year_numeric ascending — oldest first, nulls last
    const ascYears = result.current.filteredCoins.map(c => c.year_numeric);
    expect(ascYears[0]).toBe(-440);
    // Verify ascending order (null at end)
    const nonNullAsc = ascYears.filter(y => y != null) as number[];
    expect(nonNullAsc).toEqual([...nonNullAsc].sort((a, b) => a - b));

    act(() => {
      result.current.updateFilters({ sortAsc: false });
    });

    const descYears = result.current.filteredCoins.map(c => c.year_numeric);
    expect(descYears[0]).toBe(1284);
  });

  it('should filter by grade', async () => {
    const { result } = renderHook(() => useCoins());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    act(() => {
      result.current.updateFilters({ grade: ['XF'] });
    });

    expect(result.current.filteredCoins).toHaveLength(1);
    expect(result.current.filteredCoins[0].title).toBe('Sestertius of Hadrian');
  });

  it('should not filter when grade array is empty', async () => {
    const { result } = renderHook(() => useCoins());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.filteredCoins).toHaveLength(MOCK_COINS.length);
  });

  it('should derive availableGrades from collection data', async () => {
    const { result } = renderHook(() => useCoins());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.availableGrades).toEqual(['Choice VF', 'XF']);
  });

  it('should derive availableEras from collection data', async () => {
    const { result } = renderHook(() => useCoins());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.availableEras).toEqual(['Ancient', 'Medieval']);
  });

  it('should sort by title ascending and descending', async () => {
    const { result } = renderHook(() => useCoins());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    act(() => {
      result.current.updateFilters({ sortBy: 'title', sortAsc: true });
    });

    const titles = result.current.filteredCoins.map(c => c.title);
    expect(titles).toEqual([...titles].sort());

    act(() => {
      result.current.updateFilters({ sortAsc: false });
    });

    const titlesDesc = result.current.filteredCoins.map(c => c.title);
    expect(titlesDesc).toEqual([...titlesDesc].sort().reverse());
  });

  it('should sort by purchase_date with nulls sorted to end', async () => {
    const { result } = renderHook(() => useCoins());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    act(() => {
      result.current.updateFilters({ sortBy: 'purchase_date', sortAsc: true });
    });

    const dates = result.current.filteredCoins.map(c => c.purchase_date);
    const lastDate = dates[dates.length - 1];
    expect(lastDate).toBeUndefined();
  });
});
