import { useState, useCallback, useRef } from 'react';

export interface UseSelectionReturn {
  selected: Set<number>;
  isSelected: (id: number) => boolean;
  toggle: (id: number) => void;
  toggleRange: (ids: number[], anchorId: number | null, targetId: number) => void;
  selectAll: (ids: number[]) => void;
  clearAll: () => void;
  count: number;
}

export function useSelection(): UseSelectionReturn {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const isSelected = useCallback((id: number) => selectedRef.current.has(id), []);

  const toggle = useCallback((id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleRange = useCallback((ids: number[], anchorId: number | null, targetId: number) => {
    if (anchorId === null) {
      toggle(targetId);
      return;
    }
    const anchorIdx = ids.indexOf(anchorId);
    const targetIdx = ids.indexOf(targetId);
    if (anchorIdx === -1 || targetIdx === -1) {
      toggle(targetId);
      return;
    }
    const start = Math.min(anchorIdx, targetIdx);
    const end = Math.max(anchorIdx, targetIdx);
    const rangeIds = ids.slice(start, end + 1);
    setSelected(prev => {
      const next = new Set(prev);
      for (const id of rangeIds) {
        next.add(id);
      }
      return next;
    });
  }, [toggle]);

  const selectAll = useCallback((ids: number[]) => {
    setSelected(new Set(ids));
  }, []);

  const clearAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  return {
    selected,
    isSelected,
    toggle,
    toggleRange,
    selectAll,
    clearAll,
    count: selected.size,
  };
}
