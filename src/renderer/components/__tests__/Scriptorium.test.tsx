import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Scriptorium } from '../Scriptorium';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { GlossaryContext } from '../../contexts/GlossaryContext';

const mockGlossaryContext = {
  drawerState: { open: false, field: null },
  openField: vi.fn(),
  openIndex: vi.fn(),
  close: vi.fn(),
};
import * as useCoinHook from '../../hooks/useCoin';

// Mock hooks
vi.mock('../../hooks/useCoin', () => ({
  useCoin: vi.fn(() => ({ coin: null, images: [], isLoading: false }))
}));

vi.mock('../../hooks/useCoinForm', () => ({
  useCoinForm: vi.fn(() => ({
    formData: { title: '', era: 'Ancient', images: {} },
    errors: {},
    isSaving: false,
    submitError: null,
    clearError: vi.fn(),
    updateField: vi.fn(),
    updateImage: vi.fn(),
    submit: vi.fn(),
    setFormData: vi.fn()
  }))
}));

import * as useCoinFormHook from '../../hooks/useCoinForm';

vi.mock('../../hooks/useLens', () => ({
  useLens: vi.fn(() => ({
    status: 'idle',
    url: null,
    startLens: vi.fn(),
    stopLens: vi.fn()
  }))
}));

describe('Scriptorium', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dual-folio layout', () => {
    render(
      <GlossaryContext.Provider value={mockGlossaryContext}>
        <MemoryRouter initialEntries={['/scriptorium/add']}>
          <Routes>
            <Route path="/scriptorium/add" element={<Scriptorium />} />
          </Routes>
        </MemoryRouter>
      </GlossaryContext.Provider>
    );

    // Left folio: Plate Editor
    expect(screen.getAllByText(/PLATE I/i)).toBeDefined();
    expect(screen.getAllByText(/Activate Connection/i)).toBeDefined();

    // Right folio: Ledger Form
    expect(screen.getByPlaceholderText(/Designation/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/City \/ Mint/i)).toBeDefined();
  });

  it('navigates back on close button click', () => {
    render(
      <GlossaryContext.Provider value={mockGlossaryContext}>
        <MemoryRouter initialEntries={['/scriptorium/add']}>
          <Routes>
            <Route path="/scriptorium/add" element={<Scriptorium />} />
          </Routes>
        </MemoryRouter>
      </GlossaryContext.Provider>
    );

    const backButton = screen.getByText(/Close Ledger Entry/i);
    fireEvent.click(backButton);
    // Navigation is mocked by MemoryRouter, we just check if it was clickable
  });

  describe('F-02 — submit error banner', () => {
    it('renders error banner when submitError is set and dismisses on button click', async () => {
      const clearError = vi.fn();
      vi.mocked(useCoinFormHook.useCoinForm).mockReturnValue({
        formData: { title: 'Test', era: 'Ancient', images: {} },
        errors: {},
        isSaving: false,
        submitError: 'DB write failed',
        clearError,
        updateField: vi.fn(),
        updateImage: vi.fn(),
        submit: vi.fn().mockResolvedValue(false),
        clearDraft: vi.fn(),
        setFormData: vi.fn()
      });

      render(
        <GlossaryContext.Provider value={mockGlossaryContext}>
          <MemoryRouter initialEntries={['/scriptorium/add']}>
            <Routes>
              <Route path="/scriptorium/add" element={<Scriptorium />} />
            </Routes>
          </MemoryRouter>
        </GlossaryContext.Provider>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('DB write failed');

      fireEvent.click(screen.getByRole('button', { name: /dismiss error/i }));
      expect(clearError).toHaveBeenCalled();
    });

    it('does not render error banner when submitError is null', () => {
      vi.mocked(useCoinFormHook.useCoinForm).mockReturnValue({
        formData: { title: '', era: 'Ancient', images: {} },
        errors: {},
        isSaving: false,
        submitError: null,
        clearError: vi.fn(),
        updateField: vi.fn(),
        updateImage: vi.fn(),
        submit: vi.fn().mockResolvedValue(true),
        clearDraft: vi.fn(),
        setFormData: vi.fn()
      });

      render(
        <GlossaryContext.Provider value={mockGlossaryContext}>
          <MemoryRouter initialEntries={['/scriptorium/add']}>
            <Routes>
              <Route path="/scriptorium/add" element={<Scriptorium />} />
            </Routes>
          </MemoryRouter>
        </GlossaryContext.Provider>
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('shows zero-padded coin ID in meta line when editing an existing coin', () => {
    vi.mocked(useCoinHook.useCoin).mockReturnValue({
      coin: { id: 42, title: 'Test', era: 'Ancient', metal: 'Gold', images: {} } as any,
      images: [],
      isLoading: false,
      error: null,
    });

    render(
      <GlossaryContext.Provider value={mockGlossaryContext}>
        <MemoryRouter initialEntries={['/scriptorium/edit/42']}>
          <Routes>
            <Route path="/scriptorium/edit/:id" element={<Scriptorium />} />
          </Routes>
        </MemoryRouter>
      </GlossaryContext.Provider>
    );

    expect(screen.getByText(/ENTRY #042/)).toBeInTheDocument();
  });
});
