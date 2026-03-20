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
