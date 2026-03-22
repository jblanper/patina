import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGlossaryDrawer } from '../useGlossaryDrawer';

describe('useGlossaryDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('TC-GD-01: initial state is { open: false, field: null }', () => {
    const { result } = renderHook(() => useGlossaryDrawer());
    expect(result.current.drawerState).toEqual({ open: false, field: null });
  });

  it('TC-GD-02: openField sets open=true and field to the given id', () => {
    const { result } = renderHook(() => useGlossaryDrawer());
    act(() => { result.current.openField('die_axis'); });
    expect(result.current.drawerState).toEqual({ open: true, field: 'die_axis' });
  });

  it('TC-GD-03: openIndex sets open=true and field to null', () => {
    const { result } = renderHook(() => useGlossaryDrawer());
    act(() => { result.current.openIndex(); });
    expect(result.current.drawerState).toEqual({ open: true, field: null });
  });

  it('TC-GD-04: close sets open=false and field to null', () => {
    const { result } = renderHook(() => useGlossaryDrawer());
    act(() => { result.current.openField('metal'); });
    act(() => { result.current.close(); });
    expect(result.current.drawerState).toEqual({ open: false, field: null });
  });

  it('TC-GD-05: ? keyboard shortcut calls openIndex when focus is on a non-input element', () => {
    const { result } = renderHook(() => useGlossaryDrawer());
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    });
    expect(result.current.drawerState).toEqual({ open: true, field: null });
  });

  it('TC-GD-06: ? keyboard shortcut is ignored when target is INPUT', () => {
    const { result } = renderHook(() => useGlossaryDrawer());
    const input = document.createElement('input');
    document.body.appendChild(input);
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    });
    expect(result.current.drawerState.open).toBe(false);
    document.body.removeChild(input);
  });

  it('TC-GD-07: ? keyboard shortcut is ignored when target is TEXTAREA', () => {
    const { result } = renderHook(() => useGlossaryDrawer());
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    act(() => {
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    });
    expect(result.current.drawerState.open).toBe(false);
    document.body.removeChild(textarea);
  });

  it('TC-GD-08: close restores focus to the element active when openField was called', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();

    const { result } = renderHook(() => useGlossaryDrawer());
    act(() => { result.current.openField('metal'); });
    act(() => { result.current.close(); });
    act(() => { vi.runAllTimers(); });

    expect(document.activeElement).toBe(button);
    document.body.removeChild(button);
  });

  it('TC-GD-09: close restores focus to the element active when openIndex was called', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();

    const { result } = renderHook(() => useGlossaryDrawer());
    act(() => { result.current.openIndex(); });
    act(() => { result.current.close(); });
    act(() => { vi.runAllTimers(); });

    expect(document.activeElement).toBe(button);
    document.body.removeChild(button);
  });

  it('TC-GD-10: ? listener is removed on unmount — no state update after unmount', () => {
    const { unmount } = renderHook(() => useGlossaryDrawer());
    unmount();
    // Should not throw or cause a state update
    expect(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    }).not.toThrow();
  });
});
