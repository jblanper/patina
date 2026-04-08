import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { ImportDialog } from '../ImportDialog';
import { clearVocabCache } from '../../hooks/useVocabularies';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onImportComplete: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  clearVocabCache();
  // Default: file picker resolves immediately with a valid archive
  window.electronAPI.importZipPreview = vi.fn().mockResolvedValue({
    coinCount: 3, hasImages: true, exportDate: '2026-01-01T00:00:00Z', appVersion: '1.0.0',
  });
  window.electronAPI.importZipExecute = vi.fn().mockResolvedValue({
    imported: 0, skipped: 0, duplicates: [], errors: [],
  });
  window.electronAPI.importCancel = vi.fn().mockResolvedValue(undefined);
});

describe('ImportDialog', () => {
  it('TC-IMP-DLG-01: calls importZipPreview immediately on open', async () => {
    render(<ImportDialog {...defaultProps} />);
    await waitFor(() => {
      expect(window.electronAPI.importZipPreview).toHaveBeenCalledTimes(1);
    });
  });

  it('TC-IMP-DLG-02: shows archive metadata after file selected', async () => {
    render(<ImportDialog {...defaultProps} />);
    // coinCount and images-included flag should be visible
    await screen.findByText('3');
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });

  it('TC-IMP-DLG-03: closes dialog when file picker is cancelled', async () => {
    window.electronAPI.importZipPreview = vi.fn().mockResolvedValue({ cancelled: true });
    render(<ImportDialog {...defaultProps} />);
    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('TC-IMP-DLG-04: step 2 (duplicate review) skipped when no duplicates returned', async () => {
    window.electronAPI.importZipExecute = vi.fn().mockResolvedValue({
      imported: 1, skipped: 0, duplicates: [], errors: [],
    });
    render(<ImportDialog {...defaultProps} />);

    // Wait for zip-review step
    const importBtn = await screen.findByRole('button', { name: /^import$/i });
    fireEvent.click(importBtn);

    // Should go straight to result (step 3), skipping duplicate review
    await screen.findByText(/import complete/i);
    expect(screen.queryByText(/review potential duplicates/i)).not.toBeInTheDocument();
  });

  it('TC-IMP-DLG-05: step 3 result shows correct imported/skipped/error counts', async () => {
    window.electronAPI.importZipExecute = vi.fn().mockResolvedValue({
      imported: 2,
      skipped: 1,
      duplicates: [],
      errors: [{ rowIndex: 3, message: 'Title is required' }],
    });
    render(<ImportDialog {...defaultProps} />);

    const importBtn = await screen.findByRole('button', { name: /^import$/i });
    fireEvent.click(importBtn);

    await screen.findByText(/import complete/i);
    await waitFor(() => {
      expect(screen.getByText(/imported 2.*skipped 1.*errors 1/i)).toBeInTheDocument();
    });
  });

  it('TC-IMP-DLG-06: closing dialog without executing calls importCancel', async () => {
    render(<ImportDialog {...defaultProps} />);

    // Wait for the zip-review step to appear, then cancel
    await screen.findByRole('button', { name: /^import$/i });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(window.electronAPI.importCancel).toHaveBeenCalledTimes(1);
    });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('TC-IMP-DLG-07: loading indicator visible while importZipPreview is pending', async () => {
    let resolve!: (v: unknown) => void;
    window.electronAPI.importZipPreview = vi.fn().mockReturnValue(new Promise(r => { resolve = r; }));

    render(<ImportDialog {...defaultProps} />);

    // During the async IPC call, the loading indicator should appear
    await screen.findByText(/indexing\.\.\./i);

    // Resolve the picker
    resolve({ coinCount: 1, hasImages: false, exportDate: '', appVersion: '' });
    await waitFor(() => {
      expect(screen.queryByText(/indexing\.\.\./i)).not.toBeInTheDocument();
    });
  });

  it('TC-IMP-DLG-08: does not render when isOpen is false', () => {
    const { container } = render(<ImportDialog {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('TC-IMP-DLG-09: shows error message when archive is invalid', async () => {
    window.electronAPI.importZipPreview = vi.fn().mockResolvedValue({ error: 'invalid_archive' });
    render(<ImportDialog {...defaultProps} />);
    await screen.findByText(/does not appear to be a patina archive/i);
  });

  it('TC-IMP-DLG-10: onImportComplete called when coins were imported', async () => {
    window.electronAPI.importZipExecute = vi.fn().mockResolvedValue({
      imported: 5, skipped: 0, duplicates: [], errors: [],
    });
    render(<ImportDialog {...defaultProps} />);

    const importBtn = await screen.findByRole('button', { name: /^import$/i });
    fireEvent.click(importBtn);

    await screen.findByText(/import complete/i);
    expect(defaultProps.onImportComplete).toHaveBeenCalledTimes(1);
  });
});
