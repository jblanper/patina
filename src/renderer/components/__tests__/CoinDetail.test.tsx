import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { CoinDetail } from '../CoinDetail';
import * as useCoinHook from '../../hooks/useCoin';
import { Coin, CoinImage } from '../../../common/types';
import { FieldVisibilityContext } from '../../contexts/FieldVisibilityContext';
import type { FieldVisibilityMap } from '../../../common/types';
import type { VisibilityKey } from '../../../common/validation';
import { DEFAULT_FIELD_VISIBILITY } from '../../../common/validation';

// Context with all fields visible — preserves existing test assertions unchanged
const renderWithAllVisible = (ui: React.ReactElement) =>
  render(
    <FieldVisibilityContext.Provider
      value={{
        visibility: {} as FieldVisibilityMap,
        isVisible: (_key: VisibilityKey) => true,
        setVisibility: vi.fn(),
        resetToDefaults: vi.fn(),
      }}
    >
      {ui}
    </FieldVisibilityContext.Provider>
  );

// Context with selective visibility — for conditional-rendering branch tests
const renderWithVisibility = (
  ui: React.ReactElement,
  overrides: Partial<FieldVisibilityMap> = {}
) => {
  const visibility = { ...DEFAULT_FIELD_VISIBILITY, ...overrides } as FieldVisibilityMap;
  return render(
    <FieldVisibilityContext.Provider
      value={{
        visibility,
        isVisible: (key: VisibilityKey) => visibility[key] ?? true,
        setVisibility: vi.fn(),
        resetToDefaults: vi.fn(),
      }}
    >
      {ui}
    </FieldVisibilityContext.Provider>
  );
};

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

    renderWithAllVisible(<CoinDetail />);
    expect(screen.getByText('Retrieving archival record...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: null,
      images: [],
      isLoading: false,
      error: new Error('Failed'),
    });

    renderWithAllVisible(<CoinDetail />);
    expect(screen.getByText('Record not found.')).toBeInTheDocument();
  });

  it('renders coin details correctly (Ledger View)', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: mockCoin,
      images: mockImages,
      isLoading: false,
      error: null,
    });

    renderWithAllVisible(<CoinDetail />);

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

    renderWithAllVisible(<CoinDetail />);

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

    renderWithAllVisible(<CoinDetail />);

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

    renderWithAllVisible(<CoinDetail />);

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

    renderWithAllVisible(<CoinDetail />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Record' }));
    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument();
  });

  // ── Conditional field rendering (isVisible guards) ───────────────────────

  it('TC-CD-VIS-01: hides die_axis metric when ledger.die_axis=false', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: mockCoin, images: mockImages, isLoading: false, error: null,
    });
    renderWithVisibility(<CoinDetail />, { 'ledger.die_axis': false });
    expect(screen.queryByText('12h')).not.toBeInTheDocument();
  });

  it('TC-CD-VIS-02: shows die_axis metric when ledger.die_axis=true', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: mockCoin, images: mockImages, isLoading: false, error: null,
    });
    renderWithVisibility(<CoinDetail />, { 'ledger.die_axis': true });
    expect(screen.getByText('12h')).toBeInTheDocument();
  });

  it('TC-CD-VIS-03: hides acquisition footer when ledger.acquisition=false', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: mockCoin, images: mockImages, isLoading: false, error: null,
    });
    renderWithVisibility(<CoinDetail />, { 'ledger.acquisition': false });
    expect(screen.queryByText(/Test Dealer/)).not.toBeInTheDocument();
    expect(screen.queryByText('$100.00')).not.toBeInTheDocument();
  });

  it('TC-CD-VIS-04: shows acquisition footer when ledger.acquisition=true', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: mockCoin, images: mockImages, isLoading: false, error: null,
    });
    renderWithVisibility(<CoinDetail />, { 'ledger.acquisition': true });
    expect(screen.getByText(/Test Dealer/)).toBeInTheDocument();
  });

  it("TC-CD-VIS-05: hides Curator's Note when ledger.story=false", () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: mockCoin, images: mockImages, isLoading: false, error: null,
    });
    renderWithVisibility(<CoinDetail />, { 'ledger.story': false });
    expect(screen.queryByText('"This is a story."')).not.toBeInTheDocument();
  });

  it("TC-CD-VIS-06: shows Curator's Note when ledger.story=true", () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: mockCoin, images: mockImages, isLoading: false, error: null,
    });
    renderWithVisibility(<CoinDetail />, { 'ledger.story': true });
    expect(screen.getByText('"This is a story."')).toBeInTheDocument();
  });

  it('TC-CD-VIS-07: hides provenance when ledger.provenance=false', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: mockCoin, images: mockImages, isLoading: false, error: null,
    });
    renderWithVisibility(<CoinDetail />, { 'ledger.provenance': false });
    expect(screen.queryByText(/Found in a field/)).not.toBeInTheDocument();
  });

  it('TC-CD-VIS-08: hides grade metric when ledger.grade=false', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: mockCoin, images: mockImages, isLoading: false, error: null,
    });
    renderWithVisibility(<CoinDetail />, { 'ledger.grade': false });
    // Grade value 'XF' should not be in the metrics grid
    const metrics = document.querySelector('.metrics-grid');
    expect(metrics?.textContent).not.toContain('XF');
  });

  // ── TC-FLD — Field Completeness (denomination, year_numeric, rarity) ─────

  it('TC-FLD-01: denomination renders in subtitle when visible and set', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: { ...mockCoin, denomination: 'Denarius' },
      images: mockImages, isLoading: false, error: null,
    });
    renderWithVisibility(<CoinDetail />, { 'ledger.denomination': true });
    expect(screen.getByText(/Denarius/)).toBeInTheDocument();
  });

  it('TC-FLD-02: denomination absent when ledger.denomination=false', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: { ...mockCoin, denomination: 'Denarius' },
      images: mockImages, isLoading: false, error: null,
    });
    renderWithVisibility(<CoinDetail />, { 'ledger.denomination': false });
    expect(screen.queryByText(/Denarius/)).not.toBeInTheDocument();
  });

  it('TC-FLD-03: year_numeric annotation renders when coin.year_numeric is set', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: { ...mockCoin, year_numeric: -44 },
      images: mockImages, isLoading: false, error: null,
    });
    renderWithAllVisible(<CoinDetail />);
    expect(screen.getByText(/\(-44 CE\)/)).toBeInTheDocument();
  });

  it('TC-FLD-04: year_numeric annotation absent when coin.year_numeric is null', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: { ...mockCoin, year_numeric: null as unknown as number },
      images: mockImages, isLoading: false, error: null,
    });
    renderWithAllVisible(<CoinDetail />);
    expect(screen.queryByText(/CE\)/)).not.toBeInTheDocument();
  });

  it('TC-FLD-05: rarity metric renders when ledger.rarity=true', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: mockCoin, images: mockImages, isLoading: false, error: null,
    });
    renderWithVisibility(<CoinDetail />, { 'ledger.rarity': true });
    const metrics = document.querySelector('.metrics-grid');
    expect(metrics?.textContent).toContain('Common');
  });

  it('TC-FLD-06: rarity metric absent when ledger.rarity=false', () => {
    vi.spyOn(useCoinHook, 'useCoin').mockReturnValue({
      coin: mockCoin, images: mockImages, isLoading: false, error: null,
    });
    renderWithVisibility(<CoinDetail />, { 'ledger.rarity': false });
    const metrics = document.querySelector('.metrics-grid');
    expect(metrics?.textContent).not.toContain('Common');
  });
});
