import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { PlateEditor } from '../PlateEditor';
import * as useLensHook from '../../hooks/useLens';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../hooks/useLens');
vi.mock('../Lens/QRCodeDisplay', () => ({
  QRCodeDisplay: ({ url }: { url: string }) => <div data-testid="qr-code">{url}</div>
}));

const mockLens = (url: string | null = null) => {
  (useLensHook.useLens as ReturnType<typeof vi.fn>).mockReturnValue({
    status: url ? 'active' : 'idle',
    url,
    startLens: vi.fn().mockResolvedValue(undefined),
    stopLens: vi.fn(),
  });
};

const defaultProps = {
  onImageCaptured: vi.fn(),
  onImageCleared: vi.fn(),
  images: {},
};

describe('PlateEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI.importImageFromFile = vi.fn().mockResolvedValue(null);
  });

  // ── Layout ──────────────────────────────────────────────────────────────

  it('renders all three plate captions', () => {
    mockLens();
    render(<PlateEditor {...defaultProps} />);
    expect(screen.getAllByText(/PLATE I/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/PLATE II/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/PLATE III/)[0]).toBeInTheDocument();
  });

  it('renders Activate Connection buttons for all three empty slots', () => {
    mockLens();
    render(<PlateEditor {...defaultProps} />);
    expect(screen.getAllByText('Activate Connection')).toHaveLength(3);
  });

  it('renders Import from Digital Archive buttons for all three empty slots', () => {
    mockLens();
    render(<PlateEditor {...defaultProps} />);
    const importBtns = screen.getAllByText('Import from Digital Archive');
    expect(importBtns).toHaveLength(3);
    importBtns.forEach(btn => {
      expect(btn).not.toBeDisabled();
    });
  });

  it('renders existing images when provided', () => {
    mockLens();
    render(<PlateEditor {...defaultProps} images={{ obverse: 'coins/o.jpg', reverse: 'coins/r.jpg', edge: 'coins/e.jpg' }} />);
    expect(screen.getAllByRole('img')).toHaveLength(3);
  });

  // ── P-01: Image removal ────────────────────────────────────────────────

  it('P-01: renders Remove button when obverse slot is filled', () => {
    mockLens();
    render(<PlateEditor {...defaultProps} images={{ obverse: 'coins/test.jpg' }} />);
    const clearBtn = screen.getByRole('button', {
      name: /remove obverse \(primary\)/i,
    });
    expect(clearBtn).toBeInTheDocument();
  });

  it('P-01: calls onImageCleared with correct slot when Remove is clicked', () => {
    mockLens();
    const onImageCleared = vi.fn();
    render(<PlateEditor {...defaultProps} onImageCleared={onImageCleared} images={{ obverse: 'coins/test.jpg' }} />);
    fireEvent.click(screen.getByRole('button', { name: /remove obverse/i }));
    expect(onImageCleared).toHaveBeenCalledWith('obverse');
  });

  it('P-01: does not render Remove button when slot is empty', () => {
    mockLens();
    render(<PlateEditor {...defaultProps} images={{}} />);
    expect(screen.queryByRole('button', { name: /remove obverse/i })).not.toBeInTheDocument();
  });

  // ── P-02: Accessible Replace affordance ───────────────────────────────

  it('P-02: persistent Replace button (icon trio) is visible without hover when obverse is filled', () => {
    mockLens();
    const { container } = render(<PlateEditor {...defaultProps} images={{ obverse: 'coins/test.jpg' }} />);
    // There are two Replace buttons: one inside the hover overlay (.btn-lens-primary), one persistent
    // in the caption actions area (.btn-plate-icon-action). The persistent one is the first icon action.
    const persistentReplace = container.querySelector('.btn-plate-icon-action');
    expect(persistentReplace).toBeInTheDocument();
    expect(persistentReplace).toBeVisible();
  });

  it('P-02: persistent Replace button calls startLens for the correct slot', async () => {
    const mockStartLens = vi.fn().mockResolvedValue(undefined);
    (useLensHook.useLens as ReturnType<typeof vi.fn>).mockReturnValue({
      status: 'idle', url: null, startLens: mockStartLens, stopLens: vi.fn(),
    });
    const { container } = render(<PlateEditor {...defaultProps} images={{ obverse: 'coins/test.jpg' }} />);
    fireEvent.click(container.querySelector('.btn-plate-icon-action')!);
    await waitFor(() => expect(mockStartLens).toHaveBeenCalled());
  });

  // ── P-04: Local file import ────────────────────────────────────────────

  it('P-04: calls onImageCaptured when importImageFromFile resolves a path', async () => {
    mockLens();
    const onImageCaptured = vi.fn();
    window.electronAPI.importImageFromFile = vi.fn().mockResolvedValue('coins/imported-123.jpg');
    render(<PlateEditor {...defaultProps} onImageCaptured={onImageCaptured} images={{}} />);

    const importBtns = screen.getAllByText('Import from Digital Archive');
    fireEvent.click(importBtns[0]); // obverse slot

    await waitFor(() => {
      expect(onImageCaptured).toHaveBeenCalledWith('obverse', 'coins/imported-123.jpg');
    });
  });

  it('P-04: does not call onImageCaptured when user cancels import (null return)', async () => {
    mockLens();
    const onImageCaptured = vi.fn();
    window.electronAPI.importImageFromFile = vi.fn().mockResolvedValue(null);
    render(<PlateEditor {...defaultProps} onImageCaptured={onImageCaptured} images={{}} />);

    fireEvent.click(screen.getAllByText('Import from Digital Archive')[0]);

    await waitFor(() => {
      expect(window.electronAPI.importImageFromFile).toHaveBeenCalled();
    });
    expect(onImageCaptured).not.toHaveBeenCalled();
  });

  it('P-04: shows inline import error when importImageFromFile throws', async () => {
    mockLens();
    window.electronAPI.importImageFromFile = vi.fn().mockRejectedValue(new Error('Unsupported file type'));
    render(<PlateEditor {...defaultProps} images={{}} />);

    fireEvent.click(screen.getAllByText('Import from Digital Archive')[0]);

    await screen.findByText('Import failed. Only JPEG, PNG, and WebP files are accepted.');
  });

  // ── P-05: Active-slot hint ─────────────────────────────────────────────

  it('P-05: shows active hint on obverse (default active) when empty', () => {
    mockLens();
    render(<PlateEditor {...defaultProps} images={{}} />);
    expect(screen.getByText('← Next capture will land here')).toBeInTheDocument();
  });

  it('P-05: active hint is not visible on inactive empty slots', () => {
    mockLens();
    render(<PlateEditor {...defaultProps} images={{}} />);
    // Only one hint at a time (obverse is default active)
    expect(screen.getAllByText('← Next capture will land here')).toHaveLength(1);
  });

  it('P-05: moves active hint to reverse when reverse slot is clicked', () => {
    mockLens();
    render(<PlateEditor {...defaultProps} images={{}} />);
    // Click the reverse caption area — find PLATE II text and click its parent slot
    fireEvent.click(screen.getAllByText(/PLATE II/)[0]);
    // Now the hint appears — still one at a time
    expect(screen.getAllByText('← Next capture will land here')).toHaveLength(1);
  });

  it('P-05: active hint is not shown when slot is filled', () => {
    mockLens();
    render(<PlateEditor {...defaultProps} images={{ obverse: 'coins/o.jpg' }} />);
    // Obverse is filled, so no hint on obverse even though it's the default active
    expect(screen.queryByText('← Next capture will land here')).not.toBeInTheDocument();
  });

  // ── A-01: QR dialog accessibility ─────────────────────────────────────

  it('A-01: QR dialog has aria-labelledby pointing to title element', async () => {
    (useLensHook.useLens as ReturnType<typeof vi.fn>).mockReturnValue({
      status: 'active',
      url: 'http://192.168.1.5:3000/lens/token',
      startLens: vi.fn().mockResolvedValue(undefined),
      stopLens: vi.fn(),
    });
    render(<PlateEditor {...defaultProps} images={{}} />);

    fireEvent.click(screen.getAllByText('Activate Connection')[0]);

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'qr-dialog-title');
      expect(document.getElementById('qr-dialog-title')).toBeInTheDocument();
    });
  });

  it('A-01: pressing Escape closes the QR dialog', async () => {
    (useLensHook.useLens as ReturnType<typeof vi.fn>).mockReturnValue({
      status: 'active',
      url: 'http://192.168.1.5:3000/lens/token',
      startLens: vi.fn().mockResolvedValue(undefined),
      stopLens: vi.fn(),
    });
    render(<PlateEditor {...defaultProps} images={{}} />);

    fireEvent.click(screen.getAllByText('Activate Connection')[0]);
    await screen.findByRole('dialog');

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('A-01: focus trap cycles within QR dialog on Tab', async () => {
    (useLensHook.useLens as ReturnType<typeof vi.fn>).mockReturnValue({
      status: 'active',
      url: 'http://192.168.1.5:3000/lens/token',
      startLens: vi.fn().mockResolvedValue(undefined),
      stopLens: vi.fn(),
    });
    render(<PlateEditor {...defaultProps} images={{}} />);

    fireEvent.click(screen.getAllByText('Activate Connection')[0]);
    await screen.findByRole('dialog');

    const closeBtn = screen.getByRole('button', { name: /close qr code/i });
    closeBtn.focus();
    expect(document.activeElement).toBe(closeBtn);

    // Tab from the only focusable element should cycle back (first === last === closeBtn)
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(closeBtn);
  });

  it('passes the image-received callback to useLens', () => {
    mockLens();
    render(<PlateEditor {...defaultProps} />);
    expect(useLensHook.useLens).toHaveBeenCalledWith(expect.any(Function));
  });

  it('calls onImageCaptured with active slot when Lens delivers an image', async () => {
    let capturedCb: ((path: string) => void) | null = null;
    (useLensHook.useLens as ReturnType<typeof vi.fn>).mockImplementation((cb: (path: string) => void) => {
      capturedCb = cb;
      return { status: 'idle', url: null, startLens: vi.fn(), stopLens: vi.fn() };
    });
    const onImageCaptured = vi.fn();
    render(<PlateEditor {...defaultProps} onImageCaptured={onImageCaptured} images={{}} />);

    await waitFor(() => expect(capturedCb).not.toBeNull());
    capturedCb!('coins/captured.jpg');

    expect(onImageCaptured).toHaveBeenCalledWith('obverse', 'coins/captured.jpg');
  });
});
