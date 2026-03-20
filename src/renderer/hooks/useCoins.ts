import { useState, useEffect, useMemo, useCallback } from 'react';
import { Coin, NewCoin, CoinWithPrimaryImage } from '../../common/types';
import { FilterState } from '../../common/validation';
import { useDebounce } from './useDebounce';

const DEFAULT_FILTERS: FilterState = {
  era: [],
  metal: [],
  searchTerm: '',
  sortBy: 'year_numeric',
  sortAsc: true
};

export function useCoins() {
  const [coins, setCoins] = useState<CoinWithPrimaryImage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Debounce the search term to avoid expensive filtering on every keystroke
  const debouncedSearchTerm = useDebounce(filters.searchTerm, 300);

  const fetchCoins = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI.getCoins();
      setCoins(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch coins'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoins();
  }, [fetchCoins]);

  /**
   * Centralized Filtering and Sorting Logic (Memoized)
   */
  const filteredCoins = useMemo(() => {
    let result = [...coins];

    // 1. Era Filter
    if (filters.era.length > 0) {
      result = result.filter(coin => filters.era.includes(coin.era));
    }

    // 2. Metal Filter
    if (filters.metal.length > 0) {
      result = result.filter(coin => coin.metal && filters.metal.includes(coin.metal));
    }

    // 3. Search Filter
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      result = result.filter(coin => 
        coin.title.toLowerCase().includes(term) ||
        coin.issuer?.toLowerCase().includes(term) ||
        coin.denomination?.toLowerCase().includes(term) ||
        coin.year_display?.toLowerCase().includes(term) ||
        coin.provenance?.toLowerCase().includes(term) ||
        coin.catalog_ref?.toLowerCase().includes(term)
      );
    }

    // 4. Sorting
    if (filters.sortBy) {
      const field = filters.sortBy as keyof Coin;
      result.sort((a, b) => {
        const valA = a[field];
        const valB = b[field];

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        let comparison = 0;
        if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        }

        return filters.sortAsc ? comparison : -comparison;
      });
    }

    return result;
  }, [coins, filters, debouncedSearchTerm]);

  /**
   * Available Options for Filters (Derived from Data)
   */
  const availableMetals = useMemo(() => {
    const metals = new Set<string>();
    coins.forEach(c => c.metal && metals.add(c.metal));
    return Array.from(metals).sort();
  }, [coins]);

  /**
   * Mutation Wrappers
   */
  const addCoin = useCallback(async (newCoin: NewCoin) => {
    try {
      const id = await window.electronAPI.addCoin(newCoin);
      await fetchCoins();
      return id;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to add coin');
    }
  }, [fetchCoins]);

  const updateCoin = useCallback(async (id: number, updates: Partial<NewCoin>) => {
    try {
      await window.electronAPI.updateCoin(id, updates);
      await fetchCoins();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update coin');
    }
  }, [fetchCoins]);

  const deleteCoin = useCallback(async (id: number) => {
    try {
      await window.electronAPI.deleteCoin(id);
      await fetchCoins();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete coin');
    }
  }, [fetchCoins]);

  /**
   * Filter Setters
   */
  const updateFilters = useCallback((updates: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    coins,
    filteredCoins,
    loading,
    error,
    filters,
    availableMetals,
    addCoin,
    updateCoin,
    deleteCoin,
    updateFilters,
    clearFilters,
    refresh: fetchCoins
  };
}
