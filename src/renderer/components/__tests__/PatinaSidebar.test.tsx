import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PatinaSidebar } from '../PatinaSidebar';
import { FilterState } from '../../../common/validation';

const defaultFilters: FilterState = {
  era: [],
  metal: [],
  grade: [],
  searchTerm: '',
  sortBy: 'year_numeric',
  sortAsc: true
};

const defaultProps = {
  filters: defaultFilters,
  updateFilters: vi.fn(),
  clearFilters: vi.fn(),
  availableMetals: ['Silver', 'Gold'],
  availableGrades: ['Choice VF', 'XF']
};

describe('PatinaSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Order By" group with Year, Title, Acquired options', () => {
    render(<PatinaSidebar {...defaultProps} />);
    expect(screen.getByText('Order By')).toBeInTheDocument();
    expect(screen.getByText('Year')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Acquired')).toBeInTheDocument();
  });

  it('clicking a sort option calls updateFilters with correct sortBy value', () => {
    render(<PatinaSidebar {...defaultProps} />);
    fireEvent.click(screen.getByText('Title'));
    expect(defaultProps.updateFilters).toHaveBeenCalledWith({ sortBy: 'title' });
  });

  it('clicking "Asc" sets sortAsc: true', () => {
    const filters = { ...defaultFilters, sortAsc: false };
    render(<PatinaSidebar {...defaultProps} filters={filters} />);
    fireEvent.click(screen.getByText(/Asc/i));
    expect(defaultProps.updateFilters).toHaveBeenCalledWith({ sortAsc: true });
  });

  it('clicking "Desc" sets sortAsc: false', () => {
    render(<PatinaSidebar {...defaultProps} />);
    fireEvent.click(screen.getByText(/Desc/i));
    expect(defaultProps.updateFilters).toHaveBeenCalledWith({ sortAsc: false });
  });

  it('renders Grade group with provided grade values', () => {
    render(<PatinaSidebar {...defaultProps} />);
    expect(screen.getByText('Grade')).toBeInTheDocument();
    expect(screen.getByText('Choice VF')).toBeInTheDocument();
    expect(screen.getByText('XF')).toBeInTheDocument();
  });

  it('toggling a grade checkbox calls updateFilters', () => {
    render(<PatinaSidebar {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox', { name: /Filter by grade XF/i });
    fireEvent.click(checkbox);
    expect(defaultProps.updateFilters).toHaveBeenCalledWith({ grade: ['XF'] });
  });

  it('renders empty state when availableGrades is empty', () => {
    render(<PatinaSidebar {...defaultProps} availableGrades={[]} />);
    expect(screen.getByText('No grades recorded')).toBeInTheDocument();
  });

  // ── Filter Overflow: The Soft Reveal ──────────────────────────────────────

  it('renders full metals list with no truncation when ≤ 8 values', () => {
    const metals = ['Silver', 'Gold', 'Bronze', 'Copper', 'Electrum', 'Billon'];
    render(<PatinaSidebar {...defaultProps} availableMetals={metals} />);
    metals.forEach(m => expect(screen.getByText(m.toUpperCase())).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /show/i })).toBeNull();
  });

  it('renders no "Show more" button at exactly 8 metals (boundary)', () => {
    const metals = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8'];
    render(<PatinaSidebar {...defaultProps} availableMetals={metals} />);
    expect(screen.queryByRole('button', { name: /show/i })).toBeNull();
    expect(screen.getAllByRole('checkbox', { name: /Filter by .* metal/i })).toHaveLength(8);
  });

  it('truncates metals to 8 and shows "Show 1 more" at exactly 9 (boundary)', () => {
    const metals = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9'];
    render(<PatinaSidebar {...defaultProps} availableMetals={metals} />);
    expect(screen.getAllByRole('checkbox', { name: /Filter by .* metal/i })).toHaveLength(8);
    expect(screen.getByRole('button', { name: 'Show 1 more' })).toBeInTheDocument();
  });

  it('truncates metals list to 8 when > 8 values', () => {
    const metals = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'];
    render(<PatinaSidebar {...defaultProps} availableMetals={metals} />);
    expect(screen.getAllByRole('checkbox', { name: /Filter by .* metal/i })).toHaveLength(8);
    expect(screen.getByRole('button', { name: 'Show 4 more' })).toBeInTheDocument();
  });

  it('"Show N more" button text includes correct hidden count for grades', () => {
    const grades = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12', 'G13'];
    render(<PatinaSidebar {...defaultProps} availableGrades={grades} />);
    expect(screen.getByRole('button', { name: 'Show 5 more' })).toBeInTheDocument();
  });

  it('clicking "Show N more" reveals all values', () => {
    const metals = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'];
    render(<PatinaSidebar {...defaultProps} availableMetals={metals} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show 4 more' }));
    expect(screen.getAllByRole('checkbox', { name: /Filter by .* metal/i })).toHaveLength(12);
  });

  it('renders "Show less" button after expanding', () => {
    const metals = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'];
    render(<PatinaSidebar {...defaultProps} availableMetals={metals} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show 4 more' }));
    expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument();
  });

  it('clicking "Show less" collapses list back to 8', () => {
    const metals = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'];
    render(<PatinaSidebar {...defaultProps} availableMetals={metals} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show 4 more' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.getAllByRole('checkbox', { name: /Filter by .* metal/i })).toHaveLength(8);
    expect(screen.getByRole('button', { name: 'Show 4 more' })).toBeInTheDocument();
  });

  it('active selections are pinned to top before truncation', () => {
    // 'Zinc' is last in this array — without pinning it would be hidden (index 11)
    const metals = ['Aes', 'Billon', 'Bronze', 'Copper', 'Electrum', 'Gold', 'Lead', 'Orichalcum', 'Potin', 'Silver', 'Tin', 'Zinc'];
    const filters = { ...defaultFilters, metal: ['Zinc'] };
    render(<PatinaSidebar {...defaultProps} filters={filters} availableMetals={metals} />);
    // Only 8 items visible — Zinc must be among them since it's active
    const checkboxes = screen.getAllByRole('checkbox', { name: /Filter by .* metal/i });
    expect(checkboxes).toHaveLength(8);
    expect(screen.getByRole('checkbox', { name: 'Filter by Zinc metal' })).toBeInTheDocument();
  });

  it('a newly-selected value that was hidden becomes visible on re-render', () => {
    const metals = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'];
    const { rerender } = render(<PatinaSidebar {...defaultProps} availableMetals={metals} />);
    // M9 is hidden (index 8, beyond the threshold)
    expect(screen.queryByRole('checkbox', { name: 'Filter by M9 metal' })).toBeNull();
    // Select M9 — it should pin to the top on re-render
    rerender(<PatinaSidebar {...defaultProps} filters={{ ...defaultFilters, metal: ['M9'] }} availableMetals={metals} />);
    expect(screen.getByRole('checkbox', { name: 'Filter by M9 metal' })).toBeInTheDocument();
  });

  it('does not render "Show more" for Eras or Order By groups', () => {
    const metals = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9'];
    render(<PatinaSidebar {...defaultProps} availableMetals={metals} />);
    // Only one "Show more" button should exist — for metals — not for Eras or Order By
    expect(screen.getAllByRole('button', { name: /show .* more/i })).toHaveLength(1);
  });

  it('renders empty state for metals with no overflow wrapper', () => {
    render(<PatinaSidebar {...defaultProps} availableMetals={[]} />);
    expect(screen.getByText('No metals indexed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /show/i })).toBeNull();
  });

  it('Reset button is disabled when no filters are active', () => {
    render(<PatinaSidebar {...defaultProps} />);
    const resetBtn = screen.getByRole('button', { name: /Reset Archive View/i });
    expect(resetBtn).toBeDisabled();
  });

  it('Reset button is enabled when a grade filter is active', () => {
    const filters = { ...defaultFilters, grade: ['XF'] };
    render(<PatinaSidebar {...defaultProps} filters={filters} />);
    const resetBtn = screen.getByRole('button', { name: /Reset Archive View/i });
    expect(resetBtn).not.toBeDisabled();
  });
});
