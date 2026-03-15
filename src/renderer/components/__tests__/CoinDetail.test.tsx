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

// Mock useCoin hook
vi.mock('../../hooks/useCoin');

describe('CoinDetail Component', () => {
  const mockCoin: Coin = {
    id: 1,
    title: 'Test Coin',
    issuer: 'Test Issuer',
    era: 'Modern',
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
    story: 'This is a story.\nSecond paragraph.',
    provenance: 'Found in a field',
    created_at: '2023-01-01',
  };

  const mockImages: CoinImage[] = [
    { id: 1, coin_id: 1, path: 'img1.jpg', is_primary: true, sort_order: 1, created_at: '2023-01-01' },
    { id: 2, coin_id: 1, path: 'img2.jpg', is_primary: false, sort_order: 2, created_at: '2023-01-01' },
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

  it('renders coin details correctly', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: mockCoin,
      images: mockImages,
      isLoading: false,
      error: null,
    });

    render(<CoinDetail />);

    // Header
    expect(screen.getByText('Test Coin')).toBeInTheDocument();
    expect(screen.getByText('Test Issuer')).toBeInTheDocument();

    // Physical Data
    expect(screen.getByText('10.50 g')).toBeInTheDocument(); // toFixed(2)
    expect(screen.getByText('25.4 mm')).toBeInTheDocument(); // toFixed(1)
    expect(screen.getByText('Silver')).toBeInTheDocument();
    expect(screen.getByText('0.999')).toBeInTheDocument();
    expect(screen.getByText('12h')).toBeInTheDocument();

    // Attribution
    expect(screen.getByText('London')).toBeInTheDocument();
    expect(screen.getByText('Modern')).toBeInTheDocument();
    expect(screen.getByText('XF')).toBeInTheDocument();
    expect(screen.getByText('RIC 123')).toBeInTheDocument();
    expect(screen.getByText('Common')).toBeInTheDocument();

    // Descriptions
    expect(screen.getByText('OBV LEGEND')).toBeInTheDocument();
    expect(screen.getByText('Head right')).toBeInTheDocument();
    expect(screen.getByText('REV LEGEND')).toBeInTheDocument();
    expect(screen.getByText('Tail left')).toBeInTheDocument();

    // Story
    expect(screen.getByText('This is a story.')).toBeInTheDocument();
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument();
    expect(screen.getByText('Found in a field')).toBeInTheDocument();
  });

  it('handles image selection and zoom', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: mockCoin,
      images: mockImages,
      isLoading: false,
      error: null,
    });

    render(<CoinDetail />);

    const mainImage = screen.getByAltText('Test Coin'); // Uses label or title
    expect(mainImage).toHaveAttribute('src', 'patina-img://img1.jpg');

    // Click second thumbnail
    const thumbnails = screen.getAllByRole('button', { name: /Coin view/i }); // Alt text fallback
    // Since images[1] has no label, it uses 'Coin view' as alt? 
    // Wait, my component code: alt={img.label || 'Coin view'}
    
    // Actually, in the test mockImages, img1 has no label, so it uses 'Test Coin' (from title) for main image, 
    // and for thumbnails...
    // <img src={getImageUrl(img.path)} alt={img.label || 'Coin view'}
    
    // Img1 is displayed as main, alt is `mainImage.label || coin.title`.
    // Img1 is also in thumbnail strip.
    
    // Let's click the second thumbnail (img2)
    // img2 has no label, so alt is 'Coin view'
    const thumbnail2 = screen.getAllByAltText('Coin view')[1]; // img2 is second in list
    fireEvent.click(thumbnail2);

    // Now main image should be img2
    expect(mainImage).toHaveAttribute('src', 'patina-img://img2.jpg');

    // Open zoom
    fireEvent.click(mainImage.parentElement!); // Click the frame
    expect(screen.getByRole('button', { name: '×' })).toBeInTheDocument();
    
    // Close zoom
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    expect(screen.queryByRole('button', { name: '×' })).not.toBeInTheDocument();
  });

  it('navigates back', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: mockCoin,
      images: mockImages,
      isLoading: false,
      error: null,
    });

    render(<CoinDetail />);
    
    const backBtn = screen.getByRole('button', { name: 'Go back' });
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
