import { renderHook, act, waitFor } from '@testing-library/react';
import { useLens } from '../useLens';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('useLens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with idle status', () => {
    const { result } = renderHook(() => useLens());
    
    expect(result.current.status).toBe('idle');
    expect(result.current.url).toBe(null);
    expect(result.current.lastImage).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should transition to active when startLens succeeds', async () => {
    (window.electronAPI.startLens as any).mockResolvedValue({ url: 'http://localhost:3000' });
    
    const { result } = renderHook(() => useLens());
    
    await act(async () => {
      await result.current.startLens();
    });
    
    expect(result.current.status).toBe('active');
    expect(result.current.url).toBe('http://localhost:3000');
    expect(result.current.error).toBe(null);
  });

  it('should set error when startLens fails', async () => {
    (window.electronAPI.startLens as any).mockRejectedValue(new Error('Server failed'));
    
    const { result } = renderHook(() => useLens());
    
    await act(async () => {
      await result.current.startLens();
    });
    
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Failed to start local server.');
    expect(result.current.url).toBe(null);
  });

  it('should reset to idle when stopLens is called', async () => {
    (window.electronAPI.startLens as any).mockResolvedValue({ url: 'http://localhost:3000' });
    (window.electronAPI.stopLens as any).mockResolvedValue(undefined);
    
    const { result } = renderHook(() => useLens());
    
    await act(async () => {
      await result.current.startLens();
    });
    
    expect(result.current.status).toBe('active');
    
    await act(async () => {
      await result.current.stopLens();
    });
    
    expect(result.current.status).toBe('idle');
    expect(result.current.url).toBe(null);
  });

  it('should call onImageReceived callback when image is received', async () => {
    const onImageReceived = vi.fn();
    (window.electronAPI.startLens as any).mockResolvedValue({ url: 'http://localhost:3000' });
    (window.electronAPI.stopLens as any).mockResolvedValue(undefined);
    
    let imageCallback: ((path: string) => void) | null = null;
    (window.electronAPI.onLensImageReceived as any).mockImplementation((cb: (path: string) => void) => {
      imageCallback = cb;
    });
    
    renderHook(() => useLens(onImageReceived));
    
    await waitFor(() => {
      expect(window.electronAPI.onLensImageReceived).toHaveBeenCalled();
    });
    
    if (imageCallback) {
      await act(async () => {
        (imageCallback as (path: string) => void)('path/to/image.jpg');
      });
    }
    
    expect(onImageReceived).toHaveBeenCalledWith('path/to/image.jpg');
  });

  it('should set lastImage when image is received', async () => {
    (window.electronAPI.stopLens as any).mockResolvedValue(undefined);
    
    let imageCallback: ((path: string) => void) | null = null;
    (window.electronAPI.onLensImageReceived as any).mockImplementation((cb: (path: string) => void) => {
      imageCallback = cb;
    });
    
    const { result } = renderHook(() => useLens());
    
    await waitFor(() => {
      expect(window.electronAPI.onLensImageReceived).toHaveBeenCalled();
    });
    
    if (imageCallback) {
      await act(async () => {
        (imageCallback as (path: string) => void)('path/to/image.jpg');
      });
    }
    
    expect(result.current.lastImage).toBe('path/to/image.jpg');
  });

  it('should call stopLens when image is received', async () => {
    (window.electronAPI.stopLens as any).mockResolvedValue(undefined);
    
    let imageCallback: ((path: string) => void) | null = null;
    (window.electronAPI.onLensImageReceived as any).mockImplementation((cb: (path: string) => void) => {
      imageCallback = cb;
    });
    
    renderHook(() => useLens());
    
    await waitFor(() => {
      expect(window.electronAPI.onLensImageReceived).toHaveBeenCalled();
    });
    
    if (imageCallback) {
      await act(async () => {
        (imageCallback as (path: string) => void)('path/to/image.jpg');
      });
    }
    
    expect(window.electronAPI.stopLens).toHaveBeenCalled();
  });

  it('should clean up listeners on unmount', () => {
    (window.electronAPI.removeLensListeners as any).mockImplementation(() => {});
    (window.electronAPI.stopLens as any).mockResolvedValue(undefined);
    
    const { unmount } = renderHook(() => useLens());
    
    unmount();
    
    expect(window.electronAPI.removeLensListeners).toHaveBeenCalled();
  });

  it('should expose startLens and stopLens functions', () => {
    const { result } = renderHook(() => useLens());
    
    expect(typeof result.current.startLens).toBe('function');
    expect(typeof result.current.stopLens).toBe('function');
  });

  it('should handle stopLens errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (window.electronAPI.stopLens as any).mockRejectedValue(new Error('Stop failed'));
    
    const { result } = renderHook(() => useLens());
    
    await act(async () => {
      await result.current.stopLens();
    });
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should clear error when starting lens after error', async () => {
    (window.electronAPI.startLens as any)
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValueOnce({ url: 'http://localhost:3000' });
    
    const { result } = renderHook(() => useLens());
    
    await act(async () => {
      await result.current.startLens();
    });
    
    expect(result.current.error).toBe('Failed to start local server.');
    
    await act(async () => {
      await result.current.startLens();
    });
    
    expect(result.current.error).toBe(null);
  });
});