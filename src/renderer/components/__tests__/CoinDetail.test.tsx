import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoinDetail } from '../CoinDetail';
import * as useCoinHook from '../../hooks/useCoin';
import { Coin, CoinImage } from '../../../common/types';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '1' }),
  useNavigate: () => mockNavigate,
}));

describe('CoinDetail Component', () => {
  const mockCoin: Coin = {
    id: 1,
    title: 'Test Coin',
    issuer: 'Test Issuer',
    era: 'Modern',
    year_display: '2023',
    weight: 10.5,
    diameter: 25.4,
    metal: 'Silver',
    fineness: '0.999',
    die_axis: '12h',
    mint: 'London',
    grade: 'XF',
    catalog_ref: 'RIC 123',
    rarity: 'Common',
    obverse_legend: 'OBV LEGEND',
    obverse_desc: 'Head right',
    reverse_legend: 'REV LEGEND',
    reverse_desc: 'Tail left',
    edge_desc: 'Reeded',
    story: 'This is a story.\nSecond paragraph.',
    provenance: 'Found in a field',
    purchase_date: '2023-01-01',
    purchase_source: 'Test Dealer',
    purchase_price: 100,
    created_at: '2023-01-01',
  };

  const mockImages: CoinImage[] = [
    { id: 1, coin_id: 1, path: 'img1.jpg', is_primary: true, sort_order: 1, created_at: '2023-01-01' },
    { id: 2, coin_id: 1, path: 'img2.jpg', is_primary: false, sort_order: 2, created_at: '2023-01-01', label: 'Reverse' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: null,
      images: [],
      isLoading: true,
      error: null,
    });

    render(<CoinDetail />);
    expect(screen.getByText('Retrieving archival record...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: null,
      images: [],
      isLoading: false,
      error: new Error('Failed'),
    });

    render(<CoinDetail />);
    expect(screen.getByText('Record not found.')).toBeInTheDocument();
  });

  it('renders coin details correctly (Ledger View)', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: mockCoin,
      images: mockImages,
      isLoading: false,
      error: null,
    });

    render(<CoinDetail />);

    // Header
    expect(screen.getByText('Test Coin')).toBeInTheDocument();
    expect(screen.getByText(/Entry #001/)).toBeInTheDocument(); // Padstart check
    expect(screen.getByText(/Test Issuer/)).toBeInTheDocument();

    // Physical Data
    expect(screen.getByText('10.50 g')).toBeInTheDocument();
    expect(screen.getByText('25.4 mm')).toBeInTheDocument();
    expect(screen.getByText('Silver')).toBeInTheDocument();
    expect(screen.getByText('0.999')).toBeInTheDocument();
    expect(screen.getByText('12h')).toBeInTheDocument();

    // Attribution
    expect(screen.getByText(/Minted at London/)).toBeInTheDocument();
    // The year might appear multiple times (in subtitle and footer)
    expect(screen.getAllByText(/2023/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/RIC 123/)).toBeInTheDocument();
    
    // Numismatic Data
    expect(screen.getByText('OBV LEGEND')).toBeInTheDocument();
    expect(screen.getByText('Head right')).toBeInTheDocument();
    expect(screen.getByText('REV LEGEND')).toBeInTheDocument();
    expect(screen.getByText('Tail left')).toBeInTheDocument();
    expect(screen.getByText('Reeded')).toBeInTheDocument(); // Edge

    // Story & Provenance
    expect(screen.getByText('"This is a story."')).toBeInTheDocument();
    expect(screen.getByText('"Second paragraph."')).toBeInTheDocument();
    expect(screen.getByText(/Found in a field/)).toBeInTheDocument();

    // Acquisition Footer
    expect(screen.getByText(/2023-01-01/)).toBeInTheDocument();
    expect(screen.getByText(/Test Dealer/)).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument(); // Purchase price displayed
  });

  it('navigates back', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: mockCoin,
      images: mockImages,
      isLoading: false,
      error: null,
    });

    render(<CoinDetail />);

    const backBtn = screen.getByRole('button', { name: '← Close Ledger Entry' });
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('navigates to edit route', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: mockCoin,
      images: mockImages,
      isLoading: false,
      error: null,
    });

    render(<CoinDetail />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Record' }));
    expect(mockNavigate).toHaveBeenCalledWith('/scriptorium/edit/1');
  });

  it('shows delete confirmation modal and calls deleteCoin on confirm', async () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: mockCoin,
      images: mockImages,
      isLoading: false,
      error: null,
    });
    vi.mocked(window.electronAPI.deleteCoin).mockResolvedValue(true);

    render(<CoinDetail />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Record' }));
    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    expect(cancelBtn).toBeInTheDocument();
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);
    expect(window.electronAPI.deleteCoin).toHaveBeenCalledWith(1);
  });

  it('closes delete modal on cancel', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: mockCoin,
      images: mockImages,
      isLoading: false,
      error: null,
    });

    render(<CoinDetail />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Record' }));
    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument();
  });
});
