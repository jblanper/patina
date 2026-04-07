import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { BulkEditModal } from '../BulkEditModal';
import { clearVocabCache } from '../../hooks/useVocabularies';
import { FieldVisibilityContext } from '../../contexts/FieldVisibilityContext';
import { DEFAULT_FIELD_VISIBILITY } from '../../../common/validation';
import type { FieldVisibilityMap } from '../../../common/types';
import type { VisibilityKey } from '../../../common/validation';

const renderWithProviders = (ui: React.ReactElement) => {
  const visibility = { ...DEFAULT_FIELD_VISIBILITY } as FieldVisibilityMap;
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

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  selectedIds: [1, 2, 3],
  onComplete: vi.fn(),
};

describe('BulkEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearVocabCache();
    window.electronAPI.getVocab = vi.fn().mockResolvedValue(['Silver', 'Gold', 'Bronze']);
    window.electronAPI.updateCoin = vi.fn().mockResolvedValue(true);
  });

  it('TC-BEM-01: confirm button aria-disabled until field AND value selected', async () => {
    renderWithProviders(<BulkEditModal {...defaultProps} />);

    // Initially no field selected — button should be aria-disabled
    const confirmBtn = screen.getByRole('button', { name: /apply to 3 coins/i });
    expect(confirmBtn).toHaveAttribute('aria-disabled', 'true');

    // Select a field
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'metal' } });

    // Still no value — button should remain aria-disabled
    await waitFor(() => {
      expect(confirmBtn).toHaveAttribute('aria-disabled', 'true');
    });
  });

  it('TC-BEM-02: updateCoin called once per selected ID with correct field+value', async () => {
    renderWithProviders(<BulkEditModal {...defaultProps} />);

    // Select field
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'metal' } });

    // Wait for autocomplete input to appear, type to filter, then select option via mousedown
    const input = await screen.findByRole('textbox');
    fireEvent.change(input, { target: { value: 'Silver' } });
    const option = await screen.findByRole('option', { name: 'Silver' });
    fireEvent.mouseDown(option);

    const confirmBtn = screen.getByRole('button', { name: /apply to 3 coins/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(window.electronAPI.updateCoin).toHaveBeenCalledTimes(3);
      expect(window.electronAPI.updateCoin).toHaveBeenCalledWith(1, { metal: 'Silver' });
      expect(window.electronAPI.updateCoin).toHaveBeenCalledWith(2, { metal: 'Silver' });
      expect(window.electronAPI.updateCoin).toHaveBeenCalledWith(3, { metal: 'Silver' });
    });
  });

  it('TC-BEM-03: on complete, onComplete called and modal closes (onClose called)', async () => {
    renderWithProviders(<BulkEditModal {...defaultProps} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'metal' } });

    const input = await screen.findByRole('textbox');
    fireEvent.change(input, { target: { value: 'Gold' } });
    const option = await screen.findByRole('option', { name: 'Gold' });
    fireEvent.mouseDown(option);

    const confirmBtn = screen.getByRole('button', { name: /apply to 3 coins/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(defaultProps.onComplete).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('TC-BEM-04: one updateCoin rejects — remaining IDs still processed', async () => {
    window.electronAPI.updateCoin = vi.fn()
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce(true);

    renderWithProviders(<BulkEditModal {...defaultProps} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'metal' } });

    const input = await screen.findByRole('textbox');
    fireEvent.change(input, { target: { value: 'Bronze' } });
    const option = await screen.findByRole('option', { name: 'Bronze' });
    fireEvent.mouseDown(option);

    const confirmBtn = screen.getByRole('button', { name: /apply to 3 coins/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      // All 3 IDs were attempted despite the middle one failing
      expect(window.electronAPI.updateCoin).toHaveBeenCalledTimes(3);
      expect(defaultProps.onComplete).toHaveBeenCalled();
    });
  });

  it('TC-BEM-04b: ALL updateCoin calls reject — still calls onComplete', async () => {
    window.electronAPI.updateCoin = vi.fn().mockRejectedValue(new Error('DB error'));

    renderWithProviders(<BulkEditModal {...defaultProps} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'metal' } });

    const input = await screen.findByRole('textbox');
    fireEvent.change(input, { target: { value: 'Bronze' } });
    const option = await screen.findByRole('option', { name: 'Bronze' });
    fireEvent.mouseDown(option);

    const confirmBtn = screen.getByRole('button', { name: /apply to 3 coins/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(window.electronAPI.updateCoin).toHaveBeenCalledTimes(3);
      expect(defaultProps.onComplete).toHaveBeenCalled();
    });
  });

  it('TC-BEM-05: AutocompleteField rendered for selected field with vocab options', async () => {
    window.electronAPI.getVocab = vi.fn().mockResolvedValue(['Silver', 'Gold', 'Bronze']);

    renderWithProviders(<BulkEditModal {...defaultProps} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'metal' } });

    // AutocompleteField input appears
    const input = await screen.findByRole('textbox');
    expect(input).toBeInTheDocument();

    // Typing opens the dropdown with vocab options
    fireEvent.change(input, { target: { value: 'S' } });
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Silver' })).toBeInTheDocument();
    });
  });

  it('renders nothing when isOpen=false', () => {
    const { container } = renderWithProviders(
      <BulkEditModal {...defaultProps} isOpen={false} />
    );
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });
});
