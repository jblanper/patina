import { renderHook, act } from '@testing-library/react';
import { useCoinForm } from '../useCoinForm';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('useCoinForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useCoinForm());
    expect(result.current.formData.title).toBe('');
    expect(result.current.formData.era).toBe('');
  });

  it('should update fields correctly', () => {
    const { result } = renderHook(() => useCoinForm());
    
    act(() => {
      result.current.updateField('title', 'Test Coin');
      result.current.updateField('weight', 10.5);
    });

    expect(result.current.formData.title).toBe('Test Coin');
    expect(result.current.formData.weight).toBe(10.5);
  });

  it('should validate and set errors', async () => {
    const { result } = renderHook(() => useCoinForm());
    
    let success: boolean = false;
    await act(async () => {
      success = await result.current.submit();
    });

    expect(success).toBe(false);
    expect(result.current.errors.title).toBe('Designation is required');
    expect(result.current.errors.era).toBe('Era is required');
  });

  it('should handle auto-drafting', () => {
    const { result } = renderHook(() => useCoinForm());
    
    act(() => {
      result.current.updateField('title', 'Draft Coin');
    });

    // Fast-forward 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const draft = localStorage.getItem('patina_scriptorium_draft');
    expect(draft).toBeDefined();
    expect(JSON.parse(draft!).title).toBe('Draft Coin');
  });

  it('should load from draft on mount', () => {
    localStorage.setItem('patina_scriptorium_draft', JSON.stringify({
      title: 'Restored Draft',
      era: 'Medieval',
      images: {}
    }));

    const { result } = renderHook(() => useCoinForm());
    expect(result.current.formData.title).toBe('Restored Draft');
    expect(result.current.formData.era).toBe('Medieval');
  });

  it('should call electronAPI on successful submission', async () => {
    const { result } = renderHook(() => useCoinForm());
    (window.electronAPI.addCoin as any).mockResolvedValue(123);
    (window.electronAPI.addImage as any).mockResolvedValue(1);

    act(() => {
      result.current.updateField('title', 'Valid Coin');
      result.current.updateField('era', 'Roman Imperial');
      result.current.updateImage('obverse', 'path/to/img.jpg');
    });

    let success: boolean = false;
    await act(async () => {
      success = await result.current.submit();
    });

    expect(success).toBe(true);
    expect(window.electronAPI.addCoin).toHaveBeenCalledWith(expect.objectContaining({ title: 'Valid Coin' }));
    expect(window.electronAPI.addImage).toHaveBeenCalledWith(expect.objectContaining({ 
      coin_id: 123,
      path: 'path/to/img.jpg',
      label: 'Obverse'
    }));
    
    // Draft should be cleared
    expect(localStorage.getItem('patina_scriptorium_draft')).toBeNull();
  });

  it('should sync formData when initialCoin changes', () => {
    const { result, rerender } = renderHook(({ coin }) => useCoinForm(coin), {
      initialProps: { coin: null as any }
    });

    expect(result.current.formData.title).toBe('');

    const mockCoin = {
      id: 1,
      title: 'Synced Coin',
      era: 'Modern',
      created_at: '2026-01-01'
    };

    rerender({ coin: mockCoin as any });

    expect(result.current.formData.title).toBe('Synced Coin');
    expect(result.current.formData.era).toBe('Modern');
  });
});
