import { useState, useCallback } from 'react';

type ExportStatus = 'idle' | 'exporting' | 'success' | 'error';
type ExportType = 'zip' | 'pdf';

interface ExportState {
  status: ExportStatus;
  type: ExportType | null;
  error: string | null;
  resultPath: string | null;
}

export function useExport() {
  const [state, setState] = useState<ExportState>({
    status: 'idle',
    type: null,
    error: null,
    resultPath: null
  });

  const exportToZip = useCallback(async (includeImages = true, includeCsv = true) => {
    setState({ status: 'exporting', type: 'zip', error: null, resultPath: null });
    
    try {
      const result = await window.electronAPI.exportToZip({ includeImages, includeCsv });
      
      if (result.success) {
        setState({ status: 'success', type: 'zip', error: null, resultPath: result.path || null });
      } else {
        setState({ status: 'error', type: 'zip', error: result.error || 'Export failed', resultPath: null });
      }
    } catch {
      setState({ status: 'error', type: 'zip', error: 'Export failed', resultPath: null });
    }
  }, []);

  const exportToPdf = useCallback(async () => {
    setState({ status: 'exporting', type: 'pdf', error: null, resultPath: null });
    
    try {
      const result = await window.electronAPI.exportToPdf();
      
      if (result.success) {
        setState({ status: 'success', type: 'pdf', error: null, resultPath: result.path || null });
      } else {
        setState({ status: 'error', type: 'pdf', error: result.error || 'Export failed', resultPath: null });
      }
    } catch {
      setState({ status: 'error', type: 'pdf', error: 'Export failed', resultPath: null });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle', type: null, error: null, resultPath: null });
  }, []);

  return {
    ...state,
    exportToZip,
    exportToPdf,
    reset
  };
}