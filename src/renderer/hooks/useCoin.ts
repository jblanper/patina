import { useState, useEffect } from 'react';
import { Coin, CoinImage } from '../../common/types';

interface UseCoinResult {
  coin: Coin | null;
  images: CoinImage[];
  isLoading: boolean;
  error: Error | null;
}

export const useCoin = (id: string | number | undefined): UseCoinResult => {
  const [coin, setCoin] = useState<Coin | null>(null);
  const [images, setImages] = useState<CoinImage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchCoin = async () => {
      // Reset state
      setIsLoading(true);
      setError(null);
      setCoin(null);
      setImages([]);

      if (id === undefined || id === null) {
        if (isMounted) {
          setError(new Error('Invalid coin ID'));
          setIsLoading(false);
        }
        return;
      }

      const numericId = typeof id === 'string' ? parseInt(id, 10) : id;

      if (isNaN(numericId)) {
        if (isMounted) {
          setError(new Error('Invalid coin ID'));
          setIsLoading(false);
        }
        return;
      }

      try {
        const result = await window.electronAPI.getCoinById(numericId);
        
        if (isMounted) {
          if (result) {
            setCoin(result.coin);
            setImages(result.images);
          } else {
            setError(new Error('Coin not found'));
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch coin'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchCoin();

    return () => {
      isMounted = false;
    };
  }, [id]);

  return { coin, images, isLoading, error };
};
