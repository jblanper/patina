import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QRCodeDisplay } from './QRCodeDisplay';

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="qrcode" data-value={value} />,
}));

describe('QRCodeDisplay', () => {
  it('renders the QR code with the provided url', () => {
    render(<QRCodeDisplay url="http://192.168.1.1:3000/lens/abc123" />);
    const qr = screen.getByTestId('qrcode');
    expect(qr).toBeInTheDocument();
    expect(qr).toHaveAttribute('data-value', 'http://192.168.1.1:3000/lens/abc123');
  });

  it('renders the scan prompt text from locale', () => {
    const { container } = render(<QRCodeDisplay url="http://localhost" />);
    // The global mock resolves en.json keys — lens.scanPrompt splits on \n
    // Both lines appear inside the same <p> element separated by a <br/>
    const p = container.querySelector('p');
    expect(p?.textContent).toContain('Scan with your mobile device');
    expect(p?.textContent).toContain('to capture an image.');
  });
});
