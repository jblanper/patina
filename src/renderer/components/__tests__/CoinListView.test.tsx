import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { CoinListView } from '../CoinListView';
import { FieldVisibilityContext } from '../../contexts/FieldVisibilityContext';
import { DEFAULT_FIELD_VISIBILITY } from '../../../common/validation';
import type { FieldVisibilityMap, CoinWithPrimaryImage } from '../../../common/types';
import type { VisibilityKey } from '../../../common/validation';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const allVisible: FieldVisibilityMap = { ...DEFAULT_FIELD_VISIBILITY } as FieldVisibilityMap;

const renderListView = (
  props: Partial<React.ComponentProps<typeof CoinListView>> = {},
  visibilityOverrides: Partial<FieldVisibilityMap> = {}
) => {
  const visibility = { ...allVisible, ...visibilityOverrides } as FieldVisibilityMap;
  const defaultProps: React.ComponentProps<typeof CoinListView> = {
    coins: mockCoins,
    loading: false,
    selected: new Set(),
    onToggleSelect: vi.fn(),
    onSelectAll: vi.fn(),
    onClearAll: vi.fn(),
    ...props,
  };
  return render(
    <FieldVisibilityContext.Provider
      value={{
        visibility,
        isVisible: (key: VisibilityKey) => visibility[key] ?? true,
        setVisibility: vi.fn(),
        resetToDefaults: vi.fn(),
      }}
    >
      <CoinListView {...defaultProps} />
    </FieldVisibilityContext.Provider>
  );
};

const mockCoins: CoinWithPrimaryImage[] = [
  {
    id: 1,
    title: 'Aureus of Augustus',
    issuer: 'Augustus',
    denomination: 'Aureus',
    era: 'Roman Imperial',
    year_display: '27 BC',
    mint: 'Lugdunum',
    metal: 'Gold',
    grade: 'VF',
    catalog_ref: 'RIC I 1',
    created_at: '2024-01-01',
    primary_image_path: undefined,
  },
  {
    id: 2,
    title: 'Denarius of Nero',
    issuer: 'Nero',
    denomination: 'Denarius',
    era: 'Roman Imperial',
    year_display: '64 AD',
    mint: 'Rome',
    metal: 'Silver',
    grade: 'F',
    catalog_ref: 'RIC I 45',
    created_at: '2024-01-02',
    primary_image_path: 'coins/denarius.jpg',
  },
];

describe('CoinListView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-CLV-01: renders a row for each coin in the coins prop', () => {
    renderListView();
    expect(screen.getByText('Aureus of Augustus')).toBeInTheDocument();
    expect(screen.getByText('Denarius of Nero')).toBeInTheDocument();
  });

  it('TC-CLV-02: clicking a row checkbox calls onToggleSelect with correct id', () => {
    const onToggleSelect = vi.fn();
    renderListView({ onToggleSelect });
    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is the header select-all; subsequent are row checkboxes
    fireEvent.click(checkboxes[1]);
    expect(onToggleSelect).toHaveBeenCalledWith(1, false);
  });

  it('TC-CLV-03: header select-all checkbox calls onSelectAll with all visible coin ids', () => {
    const onSelectAll = vi.fn();
    renderListView({ onSelectAll });
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(onSelectAll).toHaveBeenCalledWith([1, 2]);
  });

  it('TC-CLV-04: coin-row--selected class applied to rows whose id is in selected', () => {
    const { container } = renderListView({ selected: new Set([1]) });
    const rows = container.querySelectorAll('.coin-row--selected');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Aureus of Augustus');
  });

  it('TC-CLV-05: clicking the row body calls useNavigate with /coin/:id', () => {
    renderListView();
    const row = screen.getByText('Aureus of Augustus').closest('tr')!;
    fireEvent.click(row);
    expect(mockNavigate).toHaveBeenCalledWith('/coin/1');
  });

  it('TC-CLV-06: column header sort button cycles aria-sort and re-orders rows', () => {
    const { container } = renderListView();
    // Find the Title sort button (first sortable column)
    const sortBtn = screen.getByRole('button', { name: /designation/i });
    const th = sortBtn.closest('th')!;

    // Initially unsorted
    expect(th.getAttribute('aria-sort')).toBe('none');

    // Click once → ascending
    fireEvent.click(sortBtn);
    expect(th.getAttribute('aria-sort')).toBe('ascending');

    // Click again → descending
    fireEvent.click(sortBtn);
    expect(th.getAttribute('aria-sort')).toBe('descending');

    // Click again → none
    fireEvent.click(sortBtn);
    expect(th.getAttribute('aria-sort')).toBe('none');

    // Rows render without error
    expect(container.querySelectorAll('.coin-row')).toHaveLength(2);
  });

  it('TC-CLV-07: loading=true renders a loading state with no rows', () => {
    const { container } = renderListView({ loading: true });
    expect(container.querySelectorAll('.coin-row')).toHaveLength(0);
    expect(screen.getByText(/opening the archives/i)).toBeInTheDocument();
  });

  it('TC-CLV-08: checkbox and thumbnail header cells carry sticky column classes', () => {
    const { container } = renderListView();
    const headerRow = container.querySelector('thead tr')!;
    const ths = headerRow.querySelectorAll('th');
    expect(ths[0]).toHaveClass('coin-list-col-checkbox');
    expect(ths[1]).toHaveClass('coin-list-col-thumbnail');
  });
});
