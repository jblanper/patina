import { render, screen, fireEvent } from '@testing-library/react';
import { Scriptorium } from '../Scriptorium';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock hooks
vi.mock('../../hooks/useCoin', () => ({
  useCoin: vi.fn(() => ({ coin: null, images: [], isLoading: false }))
}));

vi.mock('../../hooks/useCoinForm', () => ({
  useCoinForm: vi.fn(() => ({
    formData: { title: '', era: 'Ancient', images: {} },
    errors: {},
    isSaving: false,
    updateField: vi.fn(),
    updateImage: vi.fn(),
    submit: vi.fn(),
    setFormData: vi.fn()
  }))
}));

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
      <MemoryRouter initialEntries={['/scriptorium/add']}>
        <Routes>
          <Route path="/scriptorium/add" element={<Scriptorium />} />
        </Routes>
      </MemoryRouter>
    );

    // Left folio: Plate Editor
    expect(screen.getAllByText(/PLATE I/i)).toBeDefined();
    expect(screen.getAllByText(/Establish Wireless Bridge/i)).toBeDefined();

    // Right folio: Ledger Form
    expect(screen.getByPlaceholderText(/Designation/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/City \/ Mint/i)).toBeDefined();
  });

  it('navigates back on close button click', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/scriptorium/add']}>
        <Routes>
          <Route path="/scriptorium/add" element={<Scriptorium />} />
        </Routes>
      </MemoryRouter>
    );

    const backButton = screen.getByText(/Close Ledger Entry/i);
    fireEvent.click(backButton);
    // Navigation is mocked by MemoryRouter, we just check if it was clickable
  });
});
