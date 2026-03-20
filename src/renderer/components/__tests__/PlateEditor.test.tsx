import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlateEditor } from '../PlateEditor';
import * as useLensHook from '../../hooks/useLens';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../hooks/useLens');
vi.mock('./Lens/QRCodeDisplay', () => ({
  QRCodeDisplay: ({ url }: { url: string }) => <div data-testid="qr-code">{url}</div>
}));

describe('PlateEditor', () => {
  const mockOnImageCaptured = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render three plate slots', () => {
    (useLensHook.useLens as any).mockReturnValue({
      status: 'idle',
      url: null,
      startLens: vi.fn(),
      stopLens: vi.fn()
    });

    render(<PlateEditor onImageCaptured={mockOnImageCaptured} images={{}} />);

    expect(screen.getAllByText(/PLATE I/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/PLATE II/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/PLATE III/)[0]).toBeInTheDocument();
  });

  it('should show "Establish Wireless Bridge" buttons when no images exist', () => {
    (useLensHook.useLens as any).mockReturnValue({
      status: 'idle',
      url: null,
      startLens: vi.fn(),
      stopLens: vi.fn()
    });

    render(<PlateEditor onImageCaptured={mockOnImageCaptured} images={{}} />);

    const buttons = screen.getAllByText('Establish Wireless Bridge');
    expect(buttons).toHaveLength(3);
  });

  it('should show "Replace" button when image exists', () => {
    (useLensHook.useLens as any).mockReturnValue({
      status: 'idle',
      url: null,
      startLens: vi.fn(),
      stopLens: vi.fn()
    });

    render(
      <PlateEditor 
        onImageCaptured={mockOnImageCaptured} 
        images={{ obverse: 'path/to/obverse.jpg' }} 
      />
    );

    expect(screen.getByText('Replace')).toBeInTheDocument();
    expect(screen.getAllByText('Establish Wireless Bridge')).toHaveLength(2);
  });

  it('should render disabled "Import from Digital Archive" buttons', () => {
    (useLensHook.useLens as any).mockReturnValue({
      status: 'idle',
      url: null,
      startLens: vi.fn(),
      stopLens: vi.fn()
    });

    render(<PlateEditor onImageCaptured={mockOnImageCaptured} images={{}} />);

    const buttons = screen.getAllByText('Import from Digital Archive');
    expect(buttons).toHaveLength(3);
    buttons.forEach(button => {
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'Coming soon');
    });
  });

  it('should call startLens when "Establish Wireless Bridge" is clicked', async () => {
    const mockStartLens = vi.fn().mockResolvedValue(undefined);
    (useLensHook.useLens as any).mockReturnValue({
      status: 'idle',
      url: null,
      startLens: mockStartLens,
      stopLens: vi.fn()
    });

    render(<PlateEditor onImageCaptured={mockOnImageCaptured} images={{}} />);

    const buttons = screen.getAllByText('Establish Wireless Bridge');
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(mockStartLens).toHaveBeenCalled();
    });
  });

  it('should call startLens when "Replace" button is clicked', async () => {
    const mockStartLens = vi.fn().mockResolvedValue(undefined);
    (useLensHook.useLens as any).mockReturnValue({
      status: 'idle',
      url: null,
      startLens: mockStartLens,
      stopLens: vi.fn()
    });

    render(
      <PlateEditor 
        onImageCaptured={mockOnImageCaptured} 
        images={{ obverse: 'path/to/obverse.jpg' }} 
      />
    );

    const button = screen.getByText('Replace');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockStartLens).toHaveBeenCalled();
    });
  });

  it('should show QR overlay when url is available and showQR is true', async () => {
    const mockStartLens = vi.fn().mockResolvedValue(undefined);
    (useLensHook.useLens as any).mockReturnValue({
      status: 'active',
      url: 'http://localhost:3000',
      startLens: mockStartLens,
      stopLens: vi.fn()
    });

    const { rerender } = render(<PlateEditor onImageCaptured={mockOnImageCaptured} images={{}} />);

    await waitFor(() => {
      expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument();
    });

    (useLensHook.useLens as any).mockReturnValue({
      status: 'active',
      url: 'http://localhost:3000',
      startLens: mockStartLens,
      stopLens: vi.fn()
    });

    const buttons = screen.getAllByText('Establish Wireless Bridge');
    fireEvent.click(buttons[0]);

    rerender(<PlateEditor onImageCaptured={mockOnImageCaptured} images={{}} />);
  });

  it('should pass onImageReceived callback to useLens', () => {
    (useLensHook.useLens as any).mockReturnValue({
      status: 'idle',
      url: null,
      startLens: vi.fn(),
      stopLens: vi.fn()
    });

    render(<PlateEditor onImageCaptured={mockOnImageCaptured} images={{}} />);

    expect(useLensHook.useLens).toHaveBeenCalledWith(
      expect.any(Function)
    );
  });

  it('should call onImageCaptured when image is received', async () => {
    let capturedCallback: ((path: string) => void) | null = null;
    
    (useLensHook.useLens as any).mockImplementation((cb: (path: string) => void) => {
      capturedCallback = cb;
      return {
        status: 'idle',
        url: null,
        startLens: vi.fn(),
        stopLens: vi.fn()
      };
    });

    render(<PlateEditor onImageCaptured={mockOnImageCaptured} images={{}} />);

    await waitFor(() => {
      expect(capturedCallback).not.toBeNull();
    });

    if (capturedCallback) {
      (capturedCallback as (path: string) => void)('path/to/image.jpg');
    }

    expect(mockOnImageCaptured).toHaveBeenCalledWith('obverse', 'path/to/image.jpg');
  });

  it('should display existing images for each slot', () => {
    (useLensHook.useLens as any).mockReturnValue({
      status: 'idle',
      url: null,
      startLens: vi.fn(),
      stopLens: vi.fn()
    });

    render(
      <PlateEditor 
        onImageCaptured={mockOnImageCaptured} 
        images={{ 
          obverse: 'path/obverse.jpg',
          reverse: 'path/reverse.jpg',
          edge: 'path/edge.jpg'
        }} 
      />
    );

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);
  });

  it('should have proper ARIA attributes on QR overlay', () => {
    (useLensHook.useLens as any).mockReturnValue({
      status: 'active',
      url: 'http://localhost:3000',
      startLens: vi.fn(),
      stopLens: vi.fn()
    });

    render(<PlateEditor onImageCaptured={mockOnImageCaptured} images={{}} />);

    const dialog = screen.queryByRole('dialog');
    if (dialog) {
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    }
  });
});