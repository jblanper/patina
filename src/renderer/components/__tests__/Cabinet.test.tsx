import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { Cabinet } from '../Cabinet';
import * as useCoinsModule from '../../hooks/useCoins';
import * as useExportModule from '../../hooks/useExport';
import * as useLanguageModule from '../../hooks/useLanguage';
import { FieldVisibilityContext } from '../../contexts/FieldVisibilityContext';
import { DEFAULT_FIELD_VISIBILITY } from '../../../common/validation';
import type { FieldVisibilityMap, CoinWithPrimaryImage } from '../../../common/types';
import type { VisibilityKey } from '../../../common/validation';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string; [key: string]: unknown }) =>
    React.createElement('a', { href: to, ...rest }, children),
}));

const mockCoins: CoinWithPrimaryImage[] = [
  { id: 1, title: 'Aureus', era: 'Roman Imperial', created_at: '2024-01-01' },
  { id: 2, title: 'Denarius', era: 'Roman Imperial', created_at: '2024-01-02' },
];

const defaultCoinsReturn = {
  coins: mockCoins,
  filteredCoins: mockCoins,
  loading: false,
  error: null,
  filters: { era: [], metal: [], grade: [], searchTerm: '', sortBy: 'year_numeric' as const, sortAsc: true },
  updateFilters: vi.fn(),
  clearFilters: vi.fn(),
  addCoin: vi.fn(),
  deleteCoin: vi.fn(),
  updateCoin: vi.fn(),
  availableMetals: [],
  availableGrades: [],
  availableEras: [],
  refresh: vi.fn().mockResolvedValue(undefined),
};

const defaultExportReturn = {
  status: 'idle' as const,
  type: null,
  resultPath: null,
  error: null,
  exportToZip: vi.fn().mockResolvedValue(undefined),
  exportToPdf: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn(),
};

const renderCabinet = (visibilityOverrides: Partial<FieldVisibilityMap> = {}) => {
  const visibility = { ...DEFAULT_FIELD_VISIBILITY, ...visibilityOverrides } as FieldVisibilityMap;
  return render(
    <FieldVisibilityContext.Provider
      value={{
        visibility,
        isVisible: (key: VisibilityKey) => visibility[key] ?? true,
        setVisibility: vi.fn(),
        resetToDefaults: vi.fn(),
      }}
    >
      <Cabinet />
    </FieldVisibilityContext.Provider>
  );
};

describe('Cabinet — CAB-A1: Sidebar Collapse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useCoinsModule, 'useCoins').mockReturnValue(defaultCoinsReturn);
    vi.spyOn(useExportModule, 'useExport').mockReturnValue(defaultExportReturn);
    vi.spyOn(useLanguageModule, 'useLanguage').mockReturnValue({ language: 'en', switchLanguage: vi.fn().mockResolvedValue(undefined) });
  });

  it('TC-CAB-COL-01: .app-layout--sidebar-collapsed is absent by default', () => {
    const { container } = renderCabinet();
    expect(container.querySelector('.app-layout--sidebar-collapsed')).not.toBeInTheDocument();
  });

  it('TC-CAB-COL-02: clicking the sidebar toggle adds .app-layout--sidebar-collapsed', () => {
    const { container } = renderCabinet();
    const toggleBtn = container.querySelector('.btn-sidebar-toggle') as HTMLButtonElement;
    fireEvent.click(toggleBtn);
    expect(container.querySelector('.app-layout--sidebar-collapsed')).toBeInTheDocument();
  });

  it('TC-CAB-COL-03: clicking the sidebar toggle twice removes .app-layout--sidebar-collapsed', () => {
    const { container } = renderCabinet();
    const toggleBtn = container.querySelector('.btn-sidebar-toggle') as HTMLButtonElement;
    fireEvent.click(toggleBtn);
    fireEvent.click(toggleBtn);
    expect(container.querySelector('.app-layout--sidebar-collapsed')).not.toBeInTheDocument();
  });
});

describe('Cabinet — CAB-A', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useCoinsModule, 'useCoins').mockReturnValue(defaultCoinsReturn);
    vi.spyOn(useExportModule, 'useExport').mockReturnValue(defaultExportReturn);
    vi.spyOn(useLanguageModule, 'useLanguage').mockReturnValue({ language: 'en', switchLanguage: vi.fn().mockResolvedValue(undefined) });
  });

  it('TC-CAB-SEL-01: view toggle renders two btn-view-mode buttons', async () => {
    const { container } = renderCabinet();
    await waitFor(() => {
      const btns = container.querySelectorAll('.btn-view-mode');
      expect(btns).toHaveLength(2);
    });
  });

  it('TC-CAB-SEL-02: clicking the list toggle renders CoinListView, not GalleryGrid', async () => {
    const { container } = renderCabinet();
    await waitFor(() => {
      expect(container.querySelector('.gallery-grid')).toBeInTheDocument();
    });

    const listBtn = screen.getByRole('button', { name: /list/i });
    fireEvent.click(listBtn);

    await waitFor(() => {
      expect(container.querySelector('.coin-list-view')).toBeInTheDocument();
      expect(container.querySelector('.gallery-grid')).not.toBeInTheDocument();
    });
  });

  it('TC-CAB-SEL-03: selection persists when toggling between grid and list views', async () => {
    const { container } = renderCabinet();

    // Switch to list view
    const listBtn = screen.getByRole('button', { name: /list/i });
    fireEvent.click(listBtn);

    await waitFor(() => {
      expect(container.querySelector('.coin-list-view')).toBeInTheDocument();
    });

    // Select first coin via row checkbox (index 1 — first row checkbox after header)
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    fireEvent.click(checkboxes[1]);

    // Switch back to grid view
    const gridBtn = screen.getByRole('button', { name: /gallery/i });
    fireEvent.click(gridBtn);

    await waitFor(() => {
      expect(container.querySelector('.gallery-grid')).toBeInTheDocument();
    });

    // The selected coin card should have the --selected class
    const selectedCards = container.querySelectorAll('.coin-card--selected');
    expect(selectedCards).toHaveLength(1);
  });
});
