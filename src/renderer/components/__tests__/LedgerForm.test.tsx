import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LedgerForm } from '../LedgerForm';
import { NewCoin } from '../../../common/types';
import { GlossaryContext } from '../../contexts/GlossaryContext';

const mockGlossaryContext = {
  drawerState: { open: false, field: null },
  openField: vi.fn(),
  openIndex: vi.fn(),
  close: vi.fn(),
};

const renderForm = (ui: React.ReactElement) =>
  render(
    <GlossaryContext.Provider value={mockGlossaryContext}>
      <MemoryRouter>{ui}</MemoryRouter>
    </GlossaryContext.Provider>
  );

const baseFormData: NewCoin = {
  title: '',
  era: '',
  metal: '',
};

describe('LedgerForm', () => {
  const updateField = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('meta line entry label', () => {
    it('renders #NEW when coinId is undefined (add mode)', () => {
      renderForm(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      expect(screen.getByText(/ENTRY #NEW/)).toBeInTheDocument();
    });

    it('renders zero-padded real ID when coinId is provided (edit mode)', () => {
      renderForm(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} coinId={42} />);
      expect(screen.getByText(/ENTRY #042/)).toBeInTheDocument();
    });

    it('pads single-digit IDs to three digits', () => {
      renderForm(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} coinId={7} />);
      expect(screen.getByText(/ENTRY #007/)).toBeInTheDocument();
    });
  });

  describe('meta line fallbacks', () => {
    it('shows — when era is empty', () => {
      renderForm(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      expect(screen.getAllByText(/—/).length).toBeGreaterThanOrEqual(1);
    });

    it('shows ANCIENT when era is set to Ancient', () => {
      renderForm(<LedgerForm formData={{ ...baseFormData, era: 'Ancient' }} errors={{}} updateField={updateField} />);
      expect(screen.getByText(/ANCIENT/)).toBeInTheDocument();
    });

    it('shows — when metal is empty', () => {
      renderForm(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      expect(screen.getAllByText(/—/).length).toBeGreaterThanOrEqual(1);
    });

    it('shows uppercase metal when metal is provided', () => {
      renderForm(
        <LedgerForm
          formData={{ ...baseFormData, metal: 'silver' }}
          errors={{}}
          updateField={updateField}
        />
      );
      expect(screen.getByText(/SILVER/)).toBeInTheDocument();
    });
  });

  describe('year CE input', () => {
    it('renders year CE input in metrics grid', () => {
      renderForm(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      expect(screen.getByPlaceholderText('e.g. −44 or 134')).toBeInTheDocument();
    });

    it('calls updateField with integer on change', () => {
      renderForm(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. −44 or 134'), {
        target: { value: '134' },
      });
      expect(updateField).toHaveBeenCalledWith('year_numeric', 134);
    });

    it('calls updateField with negative integer on change', () => {
      renderForm(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. −44 or 134'), {
        target: { value: '-44' },
      });
      expect(updateField).toHaveBeenCalledWith('year_numeric', -44);
    });

    it('calls updateField with null when cleared', () => {
      renderForm(<LedgerForm formData={{ ...baseFormData, year_numeric: 134 }} errors={{}} updateField={updateField} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. −44 or 134'), {
        target: { value: '' },
      });
      expect(updateField).toHaveBeenCalledWith('year_numeric', null);
    });

    it('renders empty when formData.year_numeric is null', () => {
      // Cast needed: Coin type uses number | undefined but DB can return null at runtime
      renderForm(<LedgerForm formData={{ ...baseFormData, year_numeric: null as unknown as number }} errors={{}} updateField={updateField} />);
      expect(screen.getByPlaceholderText('e.g. −44 or 134')).toHaveValue(null);
    });

    it('renders empty when formData.year_numeric is undefined', () => {
      renderForm(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      expect(screen.getByPlaceholderText('e.g. −44 or 134')).toHaveValue(null);
    });

    it('calls openField with year_numeric when glossary hint is clicked', () => {
      renderForm(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      fireEvent.click(screen.getByLabelText(/year_numeric/i));
      expect(mockGlossaryContext.openField).toHaveBeenCalledWith('year_numeric');
    });
  });

  describe('acquisition footer', () => {
    it('renders Acquired, Source, and Cost inputs', () => {
      renderForm(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      expect(screen.getByPlaceholderText('YYYY-MM-DD')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g. CNG Auctions')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    });

    it('calls updateField with purchase_date on Acquired input change', () => {
      renderForm(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      fireEvent.change(screen.getByPlaceholderText('YYYY-MM-DD'), {
        target: { value: '2024-06-15' },
      });
      expect(updateField).toHaveBeenCalledWith('purchase_date', '2024-06-15');
    });

    it('calls updateField with purchase_source on Source input change', () => {
      renderForm(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. CNG Auctions'), {
        target: { value: 'Nomos AG' },
      });
      expect(updateField).toHaveBeenCalledWith('purchase_source', 'Nomos AG');
    });
  });
});
