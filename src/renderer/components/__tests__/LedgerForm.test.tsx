import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LedgerForm } from '../LedgerForm';
import { NewCoin } from '../../../common/types';

const baseFormData: NewCoin = {
  title: '',
  era: 'Ancient',
  metal: '',
};

describe('LedgerForm', () => {
  const updateField = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('meta line entry label', () => {
    it('renders #NEW when coinId is undefined (add mode)', () => {
      render(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      expect(screen.getByText(/ENTRY #NEW/)).toBeInTheDocument();
    });

    it('renders zero-padded real ID when coinId is provided (edit mode)', () => {
      render(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} coinId={42} />);
      expect(screen.getByText(/ENTRY #042/)).toBeInTheDocument();
    });

    it('pads single-digit IDs to three digits', () => {
      render(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} coinId={7} />);
      expect(screen.getByText(/ENTRY #007/)).toBeInTheDocument();
    });
  });

  describe('meta line fallbacks', () => {
    it('shows ANCIENT when era is set to Ancient', () => {
      render(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      expect(screen.getByText(/ANCIENT/)).toBeInTheDocument();
    });

    it('shows — when metal is empty', () => {
      render(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      expect(screen.getByText(/—/)).toBeInTheDocument();
    });

    it('shows uppercase metal when metal is provided', () => {
      render(
        <LedgerForm
          formData={{ ...baseFormData, metal: 'silver' }}
          errors={{}}
          updateField={updateField}
        />
      );
      expect(screen.getByText(/SILVER/)).toBeInTheDocument();
    });
  });

  describe('acquisition footer', () => {
    it('renders Acquired, Source, and Cost inputs', () => {
      render(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      expect(screen.getByPlaceholderText('YYYY-MM-DD')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g. CNG Auctions')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    });

    it('calls updateField with purchase_date on Acquired input change', () => {
      render(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      fireEvent.change(screen.getByPlaceholderText('YYYY-MM-DD'), {
        target: { value: '2024-06-15' },
      });
      expect(updateField).toHaveBeenCalledWith('purchase_date', '2024-06-15');
    });

    it('calls updateField with purchase_source on Source input change', () => {
      render(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. CNG Auctions'), {
        target: { value: 'Nomos AG' },
      });
      expect(updateField).toHaveBeenCalledWith('purchase_source', 'Nomos AG');
    });
  });
});
