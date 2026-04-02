import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useExport } from '../useExport';

const mockExportToZip = vi.fn();
const mockExportToPdf = vi.fn();

window.electronAPI = {
  exportToZip: mockExportToZip,
  exportToPdf: mockExportToPdf,
} as any;

describe('useExport Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportToZip', () => {
    it('should transition to exporting state when zip export starts', async () => {
      mockExportToZip.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useExport());

      await act(async () => {
        result.current.exportToZip();
      });

      expect(result.current.status).toBe('exporting');
      expect(result.current.type).toBe('zip');
      expect(result.current.error).toBeNull();
      expect(result.current.resultPath).toBeNull();
    });

    it('should transition to success state when zip export succeeds', async () => {
      mockExportToZip.mockResolvedValueOnce({ success: true, path: '/tmp/export.zip' });

      const { result } = renderHook(() => useExport());

      await result.current.exportToZip();

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      expect(result.current.type).toBe('zip');
      expect(result.current.resultPath).toBe('/tmp/export.zip');
      expect(result.current.error).toBeNull();
      expect(mockExportToZip).toHaveBeenCalledWith({ includeImages: true, includeCsv: true });
    });

    it('should transition to error state when zip export fails', async () => {
      mockExportToZip.mockResolvedValueOnce({ success: false, error: 'Disk full' });

      const { result } = renderHook(() => useExport());

      await result.current.exportToZip();

      await waitFor(() => {
        expect(result.current.status).toBe('error');
      });

      expect(result.current.type).toBe('zip');
      expect(result.current.error).toBe('Disk full');
      expect(result.current.resultPath).toBeNull();
    });

    it('should handle zip export rejection', async () => {
      mockExportToZip.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useExport());

      await result.current.exportToZip();

      await waitFor(() => {
        expect(result.current.status).toBe('error');
      });

      expect(result.current.error).toBe('Export failed');
    });

    it('should pass includeImages and includeCsv options', async () => {
      mockExportToZip.mockResolvedValueOnce({ success: true, path: '/tmp/export.zip' });

      const { result } = renderHook(() => useExport());

      await result.current.exportToZip(false, true);

      expect(mockExportToZip).toHaveBeenCalledWith({ includeImages: false, includeCsv: true });
    });
  });

  describe('exportToPdf', () => {
    it('should transition to exporting state when pdf export starts', async () => {
      mockExportToPdf.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useExport());

      await act(async () => {
        result.current.exportToPdf();
      });

      expect(result.current.status).toBe('exporting');
      expect(result.current.type).toBe('pdf');
    });

    it('should transition to success state when pdf export succeeds', async () => {
      mockExportToPdf.mockResolvedValueOnce({ success: true, path: '/tmp/catalog.pdf' });

      const { result } = renderHook(() => useExport());

      await result.current.exportToPdf();

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      expect(result.current.type).toBe('pdf');
      expect(result.current.resultPath).toBe('/tmp/catalog.pdf');
    });

    it('should transition to error state when pdf export fails', async () => {
      mockExportToPdf.mockResolvedValueOnce({ success: false, error: 'PDF generation failed' });

      const { result } = renderHook(() => useExport());

      await result.current.exportToPdf();

      await waitFor(() => {
        expect(result.current.status).toBe('error');
      });

      expect(result.current.error).toBe('PDF generation failed');
    });

    it('should call exportToPdf with the default locale ("es") when no argument given', async () => {
      mockExportToPdf.mockResolvedValueOnce({ success: true, path: '/tmp/catalog.pdf' });

      const { result } = renderHook(() => useExport());

      await result.current.exportToPdf();

      expect(mockExportToPdf).toHaveBeenCalledWith('es');
    });

    it('should call exportToPdf with an explicit locale when provided', async () => {
      mockExportToPdf.mockResolvedValueOnce({ success: true, path: '/tmp/catalog.pdf' });

      const { result } = renderHook(() => useExport());

      await result.current.exportToPdf('en');

      expect(mockExportToPdf).toHaveBeenCalledWith('en');
    });
  });

  describe('reset', () => {
    it('should reset state to idle', async () => {
      mockExportToZip.mockResolvedValueOnce({ success: true, path: '/tmp/export.zip' });

      const { result } = renderHook(() => useExport());

      await result.current.exportToZip();

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      await act(async () => {
        result.current.reset();
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.type).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.resultPath).toBeNull();
    });
  });

  describe('initial state', () => {
    it('should start with idle state', () => {
      const { result } = renderHook(() => useExport());

      expect(result.current.status).toBe('idle');
      expect(result.current.type).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.resultPath).toBeNull();
    });

    it('should have exportToZip function', () => {
      const { result } = renderHook(() => useExport());

      expect(typeof result.current.exportToZip).toBe('function');
    });

    it('should have exportToPdf function', () => {
      const { result } = renderHook(() => useExport());

      expect(typeof result.current.exportToPdf).toBe('function');
    });

    it('should have reset function', () => {
      const { result } = renderHook(() => useExport());

      expect(typeof result.current.reset).toBe('function');
    });
  });
});
