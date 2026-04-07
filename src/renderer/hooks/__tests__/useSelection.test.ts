import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useSelection } from '../useSelection';

describe('useSelection', () => {
  beforeEach(() => {
    // hook is stateless across renders — no global cleanup needed
  });

  it('TC-SEL-01: toggle adds an ID to an empty set', () => {
    const { result } = renderHook(() => useSelection());
    act(() => { result.current.toggle(1); });
    expect(result.current.selected.has(1)).toBe(true);
    expect(result.current.count).toBe(1);
  });

  it('TC-SEL-02: toggle removes an ID already in the set', () => {
    const { result } = renderHook(() => useSelection());
    act(() => { result.current.toggle(1); });
    act(() => { result.current.toggle(1); });
    expect(result.current.selected.has(1)).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it('TC-SEL-03: toggleRange with no anchor behaves as toggle', () => {
    const { result } = renderHook(() => useSelection());
    act(() => { result.current.toggleRange([1, 2, 3], null, 2); });
    expect(result.current.selected.has(2)).toBe(true);
    expect(result.current.count).toBe(1);
  });

  it('TC-SEL-04: toggleRange selects the correct contiguous range between anchor and target', () => {
    const { result } = renderHook(() => useSelection());
    const ids = [10, 20, 30, 40, 50];
    act(() => { result.current.toggleRange(ids, 20, 40); });
    expect(result.current.selected.has(10)).toBe(false);
    expect(result.current.selected.has(20)).toBe(true);
    expect(result.current.selected.has(30)).toBe(true);
    expect(result.current.selected.has(40)).toBe(true);
    expect(result.current.selected.has(50)).toBe(false);
    expect(result.current.count).toBe(3);
  });

  it('TC-SEL-05: selectAll replaces the entire selection', () => {
    const { result } = renderHook(() => useSelection());
    act(() => { result.current.toggle(99); });
    act(() => { result.current.selectAll([1, 2, 3]); });
    expect(result.current.selected.has(99)).toBe(false);
    expect(result.current.selected.has(1)).toBe(true);
    expect(result.current.selected.has(2)).toBe(true);
    expect(result.current.selected.has(3)).toBe(true);
    expect(result.current.count).toBe(3);
  });

  it('TC-SEL-06: clearAll empties the set and count returns 0', () => {
    const { result } = renderHook(() => useSelection());
    act(() => { result.current.selectAll([1, 2, 3]); });
    act(() => { result.current.clearAll(); });
    expect(result.current.count).toBe(0);
    expect(result.current.selected.size).toBe(0);
  });

  it('TC-SEL-07: isSelected returns false on an empty set and true after toggle', () => {
    const { result } = renderHook(() => useSelection());
    expect(result.current.isSelected(1)).toBe(false);
    act(() => { result.current.toggle(1); });
    expect(result.current.isSelected(1)).toBe(true);
  });
});
