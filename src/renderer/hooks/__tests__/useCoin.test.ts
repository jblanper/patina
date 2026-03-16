import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCoin } from '../useCoin';
import { Coin, CoinImage } from '../../../common/types';

// Mock window.electronAPI
const mockGetCoinById = vi.fn();

window.electronAPI = {
  getCoinById: mockGetCoinById,
} as any; // eslint-disable-line @typescript-eslint/no-explicit-any

describe('useCoin Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCoin: Coin = {
    id: 1,
    title: 'Test Coin',
    issuer: 'Test Issuer',
    era: 'Modern',
    created_at: '2023-01-01',
  };

  const mockImages: CoinImage[] = [
    { id: 1, coin_id: 1, path: 'test.jpg', is_primary: true, sort_order: 1, created_at: '2023-01-01' },
  ];

  it('should fetch coin data successfully', async () => {
    mockGetCoinById.mockResolvedValueOnce({ coin: mockCoin, images: mockImages });

    const { result } = renderHook(() => useCoin(1));

    // Initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.coin).toBeNull();
    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.coin).toEqual(mockCoin);
    expect(result.current.images).toEqual(mockImages);
    expect(result.current.error).toBeNull();
    expect(mockGetCoinById).toHaveBeenCalledWith(1);
  });

  it('should handle string ID correctly', async () => {
    mockGetCoinById.mockResolvedValueOnce({ coin: mockCoin, images: mockImages });

    const { result } = renderHook(() => useCoin('1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.coin).toEqual(mockCoin);
    expect(mockGetCoinById).toHaveBeenCalledWith(1);
  });

  it('should handle coin not found (null result)', async () => {
    mockGetCoinById.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useCoin(999));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.coin).toBeNull();
    expect(result.current.error).toEqual(new Error('Coin not found'));
  });

  it('should handle API errors', async () => {
    const error = new Error('API Error');
    mockGetCoinById.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useCoin(1));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
  });

  it('should handle invalid ID (NaN)', async () => {
    const { result } = renderHook(() => useCoin('invalid'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(new Error('Invalid coin ID'));
    expect(mockGetCoinById).not.toHaveBeenCalled();
  });
});
