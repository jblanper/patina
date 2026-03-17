import { useState, useEffect, useCallback } from 'react';

type LensStatus = 'idle' | 'starting' | 'active' | 'error';

export function useLens() {
  const [status, setStatus] = useState<LensStatus>('idle');
  const [url, setUrl] = useState<string | null>(null);
  const [lastImage, setLastImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startLens = useCallback(async () => {
    setStatus('starting');
    setError(null);
    try {
      const result = await window.electronAPI.startLens();
      setUrl(result.url);
      setStatus('active');
    } catch (err) {
      console.error('Failed to start Lens:', err);
      setStatus('error');
      setError('Failed to start local server.');
    }
  }, []);

  const stopLens = useCallback(async () => {
    try {
      await window.electronAPI.stopLens();
      setStatus('idle');
      setUrl(null);
    } catch (err) {
      console.error('Failed to stop Lens:', err);
    }
  }, []);

  useEffect(() => {
    // Listen for incoming images
    window.electronAPI.onLensImageReceived((filePath) => {
      setLastImage(filePath);
    });

    return () => {
      // Cleanup: Stop server and remove listeners
      stopLens();
      window.electronAPI.removeLensListeners();
    };
  }, [stopLens]);

  return {
    status,
    url,
    lastImage,
    error,
    startLens,
    stopLens
  };
}
