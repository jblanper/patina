import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Scriptorium } from '../Scriptorium';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { GlossaryContext } from '../../contexts/GlossaryContext';
import { FieldVisibilityContext } from '../../contexts/FieldVisibilityContext';
import { DEFAULT_FIELD_VISIBILITY } from '../../../common/validation';
import type { FieldVisibilityMap } from '../../../common/types';

const mockGlossaryContext = {
  drawerState: { open: false, field: null },
  openField: vi.fn(),
  openIndex: vi.fn(),
  close: vi.fn(),
};

import * as useCoinHook from '../../hooks/useCoin';
import * as useCoinFormHook from '../../hooks/useCoinForm';

// Mock hooks
vi.mock('../../hooks/useCoin', () => ({
  useCoin: vi.fn(() => ({ coin: null, images: [], isLoading: false, error: null }))
}));

vi.mock('../../hooks/useCoinForm', () => ({
  useCoinForm: vi.fn(() => ({
    formData: { title: '', era: 'Ancient', images: {} },
    errors: {},
    isSaving: false,
    isDirty: false,
    imagesChanged: false,
    submitError: null,
    clearError: vi.fn(),
    updateField: vi.fn(),
    updateImage: vi.fn(),
    submit: vi.fn(),
    clearDraft: vi.fn(),
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

// Mock react-router-dom — module-level so we can spy on navigate
const mockNavigate = vi.fn();
const mockUseParams = vi.fn(() => ({ id: undefined as string | undefined }));

vi.mock('react-router-dom', () => ({
  useParams: () => mockUseParams(),
  useNavigate: () => mockNavigate,
}));

const makeVisibilityContext = () => ({
  visibility: { ...DEFAULT_FIELD_VISIBILITY } as FieldVisibilityMap,
  isVisible: (_key: string) => true,
  setVisibility: vi.fn(),
  resetToDefaults: vi.fn(),
});

const renderScriptorium = () =>
  render(
    <FieldVisibilityContext.Provider value={makeVisibilityContext()}>
      <GlossaryContext.Provider value={mockGlossaryContext}>
        <Scriptorium />
      </GlossaryContext.Provider>
    </FieldVisibilityContext.Provider>
  );

describe('Scriptorium', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ id: undefined });
    vi.mocked(useCoinHook.useCoin).mockReturnValue({ coin: null, images: [], isLoading: false, error: null });
    vi.mocked(useCoinFormHook.useCoinForm).mockReturnValue({
      formData: { title: '', era: 'Ancient', images: {} },
      errors: {},
      isSaving: false,
      isDirty: false,
      imagesChanged: false,
      submitError: null,
      clearError: vi.fn(),
      updateField: vi.fn(),
      updateImage: vi.fn(),
      submit: vi.fn(),
      clearDraft: vi.fn(),
      setFormData: vi.fn()
    });
  });

  it('renders dual-folio layout', () => {
    renderScriptorium();
    // Left folio: Plate Editor
    expect(screen.getAllByText(/PLATE I/i)).toBeDefined();
    expect(screen.getAllByText(/Activate Connection/i)).toBeDefined();
    // Right folio: Ledger Form
    expect(screen.getByPlaceholderText(/Designation/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/City \/ Mint/i)).toBeDefined();
  });

  it('navigates back on close button click when not dirty', () => {
    renderScriptorium();
    fireEvent.click(screen.getByText(/Close Ledger Entry/i));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  describe('F-02 — submit error banner', () => {
    it('renders error banner when submitError is set and dismisses on button click', async () => {
      const clearError = vi.fn();
      vi.mocked(useCoinFormHook.useCoinForm).mockReturnValue({
        formData: { title: 'Test', era: 'Ancient', images: {} },
        errors: {},
        isSaving: false,
        isDirty: false,
        imagesChanged: false,
        submitError: 'DB write failed',
        clearError,
        updateField: vi.fn(),
        updateImage: vi.fn(),
        submit: vi.fn().mockResolvedValue(false),
        clearDraft: vi.fn(),
        setFormData: vi.fn()
      });

      renderScriptorium();

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
        isDirty: false,
        imagesChanged: false,
        submitError: null,
        clearError: vi.fn(),
        updateField: vi.fn(),
        updateImage: vi.fn(),
        submit: vi.fn().mockResolvedValue(true),
        clearDraft: vi.fn(),
        setFormData: vi.fn()
      });

      renderScriptorium();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('shows zero-padded coin ID in meta line when editing an existing coin', () => {
    mockUseParams.mockReturnValue({ id: '42' });
    vi.mocked(useCoinHook.useCoin).mockReturnValue({
      coin: { id: 42, title: 'Test', era: 'Ancient', metal: 'Gold' } as any,
      images: [],
      isLoading: false,
      error: null,
    });

    renderScriptorium();
    expect(screen.getByText(/ENTRY #042/)).toBeInTheDocument();
  });

  describe('F-03 — draft-status label', () => {
    it('shows "Draft Preserved" in add mode when not saving', () => {
      renderScriptorium();
      expect(screen.getByText('Draft Preserved')).toBeInTheDocument();
    });

    it('shows "Indexing..." in add mode when isSaving', () => {
      vi.mocked(useCoinFormHook.useCoinForm).mockReturnValue({
        formData: { title: '', era: '', images: {} },
        errors: {},
        isSaving: true,
        isDirty: false,
        imagesChanged: false,
        submitError: null,
        clearError: vi.fn(),
        updateField: vi.fn(),
        updateImage: vi.fn(),
        submit: vi.fn(),
        clearDraft: vi.fn(),
        setFormData: vi.fn()
      });
      renderScriptorium();
      expect(screen.getByText('Indexing...')).toBeInTheDocument();
      expect(screen.queryByText('Draft Preserved')).not.toBeInTheDocument();
    });

    it('shows "Editing Record" in edit mode when not saving', () => {
      mockUseParams.mockReturnValue({ id: '1' });
      vi.mocked(useCoinHook.useCoin).mockReturnValue({
        coin: { id: 1, title: 'Test', era: 'Ancient' } as any,
        images: [],
        isLoading: false,
        error: null,
      });
      renderScriptorium();
      expect(screen.getByText('Editing Record')).toBeInTheDocument();
      expect(screen.queryByText('Draft Preserved')).not.toBeInTheDocument();
    });

    it('shows "Indexing..." in edit mode when isSaving', () => {
      mockUseParams.mockReturnValue({ id: '1' });
      vi.mocked(useCoinFormHook.useCoinForm).mockReturnValue({
        formData: { title: 'Test', era: 'Ancient', images: {} },
        errors: {},
        isSaving: true,
        isDirty: false,
        imagesChanged: false,
        submitError: null,
        clearError: vi.fn(),
        updateField: vi.fn(),
        updateImage: vi.fn(),
        submit: vi.fn(),
        clearDraft: vi.fn(),
        setFormData: vi.fn()
      });
      renderScriptorium();
      expect(screen.getByText('Indexing...')).toBeInTheDocument();
      expect(screen.queryByText('Editing Record')).not.toBeInTheDocument();
    });
  });

  describe('F-04 — unsaved-changes guard on back-navigation', () => {
    it('navigates immediately when form is not dirty in edit mode', () => {
      mockUseParams.mockReturnValue({ id: '1' });
      vi.mocked(useCoinFormHook.useCoinForm).mockReturnValue({
        formData: { title: 'Original', era: 'Ancient', images: {} },
        errors: {},
        isSaving: false,
        isDirty: false,
        imagesChanged: false,
        submitError: null,
        clearError: vi.fn(),
        updateField: vi.fn(),
        updateImage: vi.fn(),
        submit: vi.fn(),
        clearDraft: vi.fn(),
        setFormData: vi.fn()
      });

      renderScriptorium();
      fireEvent.click(screen.getByText(/Close Ledger Entry/i));
      expect(mockNavigate).toHaveBeenCalledWith(-1);
      expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
    });

    it('shows confirmation modal when form is dirty in edit mode', () => {
      mockUseParams.mockReturnValue({ id: '1' });
      vi.mocked(useCoinFormHook.useCoinForm).mockReturnValue({
        formData: { title: 'Modified', era: 'Ancient', images: {} },
        errors: {},
        isSaving: false,
        isDirty: true,
        imagesChanged: false,
        submitError: null,
        clearError: vi.fn(),
        updateField: vi.fn(),
        updateImage: vi.fn(),
        submit: vi.fn(),
        clearDraft: vi.fn(),
        setFormData: vi.fn()
      });

      renderScriptorium();
      fireEvent.click(screen.getByText(/Close Ledger Entry/i));
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('"Continue Editing" dismisses modal without navigating', () => {
      mockUseParams.mockReturnValue({ id: '1' });
      vi.mocked(useCoinFormHook.useCoinForm).mockReturnValue({
        formData: { title: 'Modified', era: 'Ancient', images: {} },
        errors: {},
        isSaving: false,
        isDirty: true,
        imagesChanged: false,
        submitError: null,
        clearError: vi.fn(),
        updateField: vi.fn(),
        updateImage: vi.fn(),
        submit: vi.fn(),
        clearDraft: vi.fn(),
        setFormData: vi.fn()
      });

      renderScriptorium();
      fireEvent.click(screen.getByText(/Close Ledger Entry/i));
      fireEvent.click(screen.getByText('Continue Editing'));
      expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('"Discard Changes" navigates back', () => {
      mockUseParams.mockReturnValue({ id: '1' });
      vi.mocked(useCoinFormHook.useCoinForm).mockReturnValue({
        formData: { title: 'Modified', era: 'Ancient', images: {} },
        errors: {},
        isSaving: false,
        isDirty: true,
        imagesChanged: false,
        submitError: null,
        clearError: vi.fn(),
        updateField: vi.fn(),
        updateImage: vi.fn(),
        submit: vi.fn(),
        clearDraft: vi.fn(),
        setFormData: vi.fn()
      });

      renderScriptorium();
      fireEvent.click(screen.getByText(/Close Ledger Entry/i));
      fireEvent.click(screen.getByText('Discard Changes'));
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('shows modal when imagesChanged is true even if isDirty is false', () => {
      mockUseParams.mockReturnValue({ id: '1' });
      vi.mocked(useCoinFormHook.useCoinForm).mockReturnValue({
        formData: { title: 'Original', era: 'Ancient', images: { obverse: 'new.jpg' } },
        errors: {},
        isSaving: false,
        isDirty: false,
        imagesChanged: true,
        submitError: null,
        clearError: vi.fn(),
        updateField: vi.fn(),
        updateImage: vi.fn(),
        submit: vi.fn(),
        clearDraft: vi.fn(),
        setFormData: vi.fn()
      });

      renderScriptorium();
      fireEvent.click(screen.getByText(/Close Ledger Entry/i));
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    });
  });

  describe('F-05 — discard draft button in add mode', () => {
    it('does not show "Discard Draft" button when formData is empty', () => {
      vi.mocked(useCoinFormHook.useCoinForm).mockReturnValue({
        formData: { title: '', era: '', images: {} },
        errors: {},
        isSaving: false,
        isDirty: false,
        imagesChanged: false,
        submitError: null,
        clearError: vi.fn(),
        updateField: vi.fn(),
        updateImage: vi.fn(),
        submit: vi.fn(),
        clearDraft: vi.fn(),
        setFormData: vi.fn()
      });

      renderScriptorium();
      expect(screen.queryByText('Discard Draft')).not.toBeInTheDocument();
    });

    it('does not show "Discard Draft" button when only images are set (no text fields)', () => {
      vi.mocked(useCoinFormHook.useCoinForm).mockReturnValue({
        formData: { title: '', era: '', images: { obverse: 'path/to/img.jpg' } },
        errors: {},
        isSaving: false,
        isDirty: false,
        imagesChanged: false,
        submitError: null,
        clearError: vi.fn(),
        updateField: vi.fn(),
        updateImage: vi.fn(),
        submit: vi.fn(),
        clearDraft: vi.fn(),
        setFormData: vi.fn()
      });

      renderScriptorium();
      expect(screen.queryByText('Discard Draft')).not.toBeInTheDocument();
    });

    it('shows "Discard Draft" button when a text field is populated in add mode', () => {
      vi.mocked(useCoinFormHook.useCoinForm).mockReturnValue({
        formData: { title: 'Draft Title', era: '', images: {} },
        errors: {},
        isSaving: false,
        isDirty: false,
        imagesChanged: false,
        submitError: null,
        clearError: vi.fn(),
        updateField: vi.fn(),
        updateImage: vi.fn(),
        submit: vi.fn(),
        clearDraft: vi.fn(),
        setFormData: vi.fn()
      });

      renderScriptorium();
      expect(screen.getByText('Discard Draft')).toBeInTheDocument();
    });

    it('does not show "Discard Draft" button in edit mode even when form is populated', () => {
      mockUseParams.mockReturnValue({ id: '1' });
      vi.mocked(useCoinFormHook.useCoinForm).mockReturnValue({
        formData: { title: 'Some Title', era: 'Ancient', images: {} },
        errors: {},
        isSaving: false,
        isDirty: false,
        imagesChanged: false,
        submitError: null,
        clearError: vi.fn(),
        updateField: vi.fn(),
        updateImage: vi.fn(),
        submit: vi.fn(),
        clearDraft: vi.fn(),
        setFormData: vi.fn()
      });

      renderScriptorium();
      expect(screen.queryByText('Discard Draft')).not.toBeInTheDocument();
    });

    it('clicking "Discard Draft" opens confirmation modal', () => {
      vi.mocked(useCoinFormHook.useCoinForm).mockReturnValue({
        formData: { title: 'Draft', era: '', images: {} },
        errors: {},
        isSaving: false,
        isDirty: false,
        imagesChanged: false,
        submitError: null,
        clearError: vi.fn(),
        updateField: vi.fn(),
        updateImage: vi.fn(),
        submit: vi.fn(),
        clearDraft: vi.fn(),
        setFormData: vi.fn()
      });

      renderScriptorium();
      fireEvent.click(screen.getByText('Discard Draft'));
      expect(screen.getByRole('heading', { name: 'Discard Draft' })).toBeInTheDocument();
      expect(screen.getByText(/permanently clear/i)).toBeInTheDocument();
    });

    it('"Keep Draft" closes the modal without clearing', () => {
      const clearDraft = vi.fn();
      vi.mocked(useCoinFormHook.useCoinForm).mockReturnValue({
        formData: { title: 'Draft', era: '', images: {} },
        errors: {},
        isSaving: false,
        isDirty: false,
        imagesChanged: false,
        submitError: null,
        clearError: vi.fn(),
        updateField: vi.fn(),
        updateImage: vi.fn(),
        submit: vi.fn(),
        clearDraft,
        setFormData: vi.fn()
      });

      renderScriptorium();
      fireEvent.click(screen.getByText('Discard Draft'));
      fireEvent.click(screen.getByText('Keep Draft'));
      expect(clearDraft).not.toHaveBeenCalled();
      expect(screen.queryByRole('heading', { name: 'Discard Draft' })).not.toBeInTheDocument();
    });

    it('confirming discard calls clearDraft and closes modal', () => {
      const clearDraft = vi.fn();
      vi.mocked(useCoinFormHook.useCoinForm).mockReturnValue({
        formData: { title: 'Draft', era: '', images: {} },
        errors: {},
        isSaving: false,
        isDirty: false,
        imagesChanged: false,
        submitError: null,
        clearError: vi.fn(),
        updateField: vi.fn(),
        updateImage: vi.fn(),
        submit: vi.fn(),
        clearDraft,
        setFormData: vi.fn()
      });

      renderScriptorium();
      fireEvent.click(screen.getByText('Discard Draft'));
      // The confirm button inside the modal (not the header button)
      const discardButtons = screen.getAllByText('Discard');
      fireEvent.click(discardButtons[0]);
      expect(clearDraft).toHaveBeenCalled();
      expect(screen.queryByRole('heading', { name: 'Discard Draft' })).not.toBeInTheDocument();
    });
  });
});
