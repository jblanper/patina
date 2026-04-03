import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LedgerForm } from '../LedgerForm';
import { NewCoin } from '../../../common/types';
import { GlossaryContext } from '../../contexts/GlossaryContext';
import { FieldVisibilityContext } from '../../contexts/FieldVisibilityContext';
import { DEFAULT_FIELD_VISIBILITY } from '../../../common/validation';
import type { FieldVisibilityMap } from '../../../common/types';
import { clearVocabCache } from '../../hooks/useVocabularies';

const mockGlossaryContext = {
  drawerState: { open: false, field: null },
  openField: vi.fn(),
  openIndex: vi.fn(),
  close: vi.fn(),
};

const makeVisibilityContext = (overrides: Partial<FieldVisibilityMap> = {}) => ({
  visibility: { ...DEFAULT_FIELD_VISIBILITY, ...overrides } as FieldVisibilityMap,
  isVisible: (key: string) => {
    const map = { ...DEFAULT_FIELD_VISIBILITY, ...overrides } as Record<string, boolean>;
    return map[key] ?? true;
  },
  setVisibility: vi.fn(),
  resetToDefaults: vi.fn(),
});

const renderForm = (ui: React.ReactElement, visibilityOverrides: Partial<FieldVisibilityMap> = {}) =>
  render(
    <FieldVisibilityContext.Provider value={makeVisibilityContext(visibilityOverrides)}>
      <GlossaryContext.Provider value={mockGlossaryContext}>
        <MemoryRouter>{ui}</MemoryRouter>
      </GlossaryContext.Provider>
    </FieldVisibilityContext.Provider>
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

  describe('L-02 — year_display and year_numeric in subtitle-stack', () => {
    it('renders year_numeric input within .subtitle-stack (not .metrics-grid)', () => {
      const { container } = renderForm(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      const subtitleStack = container.querySelector('.subtitle-stack');
      expect(subtitleStack).not.toBeNull();
      // year_numeric uses yearCe placeholder — must be found inside subtitle-stack
      const yearCeInput = screen.getByPlaceholderText('e.g. −44 or 134');
      expect(subtitleStack!.contains(yearCeInput)).toBe(true);
    });

    it('year_numeric is NOT inside .metrics-grid', () => {
      const { container } = renderForm(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      const metricsGrid = container.querySelector('.metrics-grid');
      const yearCeInput = screen.getByPlaceholderText('e.g. −44 or 134');
      expect(metricsGrid!.contains(yearCeInput)).toBe(false);
    });

    it('calls updateField with integer on year_numeric change', () => {
      renderForm(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. −44 or 134'), {
        target: { value: '134' },
      });
      expect(updateField).toHaveBeenCalledWith('year_numeric', 134);
    });

    it('calls updateField with negative integer on year_numeric change', () => {
      renderForm(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. −44 or 134'), {
        target: { value: '-44' },
      });
      expect(updateField).toHaveBeenCalledWith('year_numeric', -44);
    });

    it('calls updateField with null when year_numeric cleared', () => {
      renderForm(<LedgerForm formData={{ ...baseFormData, year_numeric: 134 }} errors={{}} updateField={updateField} />);
      fireEvent.change(screen.getByPlaceholderText('e.g. −44 or 134'), {
        target: { value: '' },
      });
      expect(updateField).toHaveBeenCalledWith('year_numeric', null);
    });

    it('renders empty when formData.year_numeric is null', () => {
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

  describe('L-03 — provenance as textarea', () => {
    it('renders provenance as a textarea when visible', () => {
      const { container } = renderForm(
        <LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />,
        { 'ledger.provenance': true }
      );
      const provenance = container.querySelector('textarea[placeholder="e.g. Ex. BCD Collection; Purchased 2024"]');
      expect(provenance).not.toBeNull();
      expect(provenance!.tagName).toBe('TEXTAREA');
    });
  });

  describe('L-04 — metrics grid item count after year_numeric removal', () => {
    it('main metrics-grid has 7 items (excludes year_numeric which moved to subtitle-stack)', () => {
      const { container } = renderForm(
        <LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />,
        {
          'ledger.die_axis': true,
          'ledger.fineness': true,
        }
      );
      // The first .metrics-grid is the main one (not the footer or hidden-fields-grid)
      const metricsGrid = container.querySelector('.metrics-grid');
      expect(metricsGrid!.querySelectorAll('.metric-item')).toHaveLength(7);
    });
  });

  describe('L-06 — purchase_date as type="date"', () => {
    it('renders purchase_date as type="date" input when acquisition is visible', () => {
      const { container } = renderForm(
        <LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />,
        { 'ledger.acquisition': true }
      );
      const dateInputs = container.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBeGreaterThan(0);
    });

    it('calls updateField with purchase_date value on date input change', () => {
      renderForm(
        <LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />,
        { 'ledger.acquisition': true }
      );
      // There's no placeholder on type="date"; query by type
      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: '2024-06-15' } });
      expect(updateField).toHaveBeenCalledWith('purchase_date', '2024-06-15');
    });

    it('calls updateField with purchase_source on Source input change', () => {
      renderForm(
        <LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />,
        { 'ledger.acquisition': true }
      );
      fireEvent.change(screen.getByPlaceholderText('e.g. CNG Auctions'), {
        target: { value: 'Nomos AG' },
      });
      expect(updateField).toHaveBeenCalledWith('purchase_source', 'Nomos AG');
    });
  });

  describe('V-01 — hidden fields accordion', () => {
    it('accordion is not rendered when all fields are visible', () => {
      const { container } = renderForm(
        <LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />,
        {
          'ledger.die_axis':    true,
          'ledger.fineness':    true,
          'ledger.edge_desc':   true,
          'ledger.provenance':  true,
          'ledger.acquisition': true,
        }
      );
      expect(container.querySelector('.hidden-fields-accordion')).toBeNull();
    });

    it('accordion renders when die_axis is hidden', () => {
      const { container } = renderForm(
        <LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />,
        { 'ledger.die_axis': false }
      );
      expect(container.querySelector('.hidden-fields-accordion')).not.toBeNull();
    });

    it('die_axis field is inside .hidden-fields-accordion when hidden', () => {
      const { container } = renderForm(
        <LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />,
        { 'ledger.die_axis': false }
      );
      const accordion = container.querySelector('.hidden-fields-accordion');
      const dieAxisInput = screen.getByPlaceholderText('e.g. 6h');
      expect(accordion!.contains(dieAxisInput)).toBe(true);
    });

    it('accordion is closed by default', () => {
      const { container } = renderForm(
        <LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />,
        { 'ledger.die_axis': false }
      );
      const details = container.querySelector('details.hidden-fields-accordion');
      expect(details).not.toHaveAttribute('open');
    });

    it('die_axis field is NOT in main metrics-grid when hidden', () => {
      const { container } = renderForm(
        <LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />,
        { 'ledger.die_axis': false }
      );
      const mainMetricsGrid = container.querySelector('.metrics-grid:not(.hidden-fields-grid)');
      const dieAxisInput = screen.getByPlaceholderText('e.g. 6h');
      expect(mainMetricsGrid!.contains(dieAxisInput)).toBe(false);
    });
  });

  describe('TC-FLD — Field Completeness (edge_desc, rarity)', () => {
    it('TC-FLD-07: edge_desc textarea is present in LedgerForm when visible', () => {
      renderForm(
        <LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />,
        { 'ledger.edge_desc': true }
      );
      expect(screen.getByPlaceholderText('e.g. Reeded / Plain / DECUS ET TUTAMEN')).toBeInTheDocument();
    });

    it('TC-FLD-08: updating edge_desc textarea calls updateField with edge_desc', () => {
      renderForm(
        <LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />,
        { 'ledger.edge_desc': true }
      );
      fireEvent.change(screen.getByPlaceholderText('e.g. Reeded / Plain / DECUS ET TUTAMEN'), {
        target: { value: 'Reeded' },
      });
      expect(updateField).toHaveBeenCalledWith('edge_desc', 'Reeded');
    });

    it('TC-FLD-09: rarity AutocompleteField is present in LedgerForm metrics grid', () => {
      renderForm(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      expect(screen.getByPlaceholderText('e.g. R / RR / Common')).toBeInTheDocument();
    });
  });

  describe('F-01 — era error propagation', () => {
    it('shows error-hint beneath era AutocompleteField when errors.era is set', () => {
      renderForm(
        <LedgerForm formData={baseFormData} errors={{ era: 'Era is required' }} updateField={updateField} />
      );
      expect(screen.getByText('Era is required')).toBeInTheDocument();
    });

    it('does not show error-hint for other AutocompleteFields when only era has an error', () => {
      renderForm(
        <LedgerForm formData={baseFormData} errors={{ era: 'Era is required' }} updateField={updateField} />
      );
      const hints = screen.getAllByText('Era is required');
      expect(hints).toHaveLength(1);
    });
  });

  describe('L-01 — required field indicators', () => {
    it('renders exactly 2 required-dot elements (title and era)', () => {
      const { container } = renderForm(
        <LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />
      );
      expect(container.querySelectorAll('.required-dot')).toHaveLength(2);
    });

    it('renders exactly 1 required-note element', () => {
      const { container } = renderForm(
        <LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />
      );
      expect(container.querySelectorAll('.required-note')).toHaveLength(1);
    });
  });

  describe('L-05 — purchase_price placeholder i18n', () => {
    it('uses i18n translation for purchase_price placeholder when acquisition is visible', () => {
      renderForm(
        <LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />,
        { 'ledger.acquisition': true }
      );
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    });
  });

  describe('N-01 — onIncrementUsage wired to AutocompleteField', () => {
    beforeEach(() => {
      clearVocabCache();
    });

    it('calls incrementVocabUsage when an existing era option is selected', async () => {
      (window.electronAPI.getVocab as ReturnType<typeof vi.fn>).mockResolvedValue(['Roman Imperial', 'Ancient']);
      renderForm(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);

      // Flush async vocab loading before opening dropdown
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

      const eraInput = screen.getByPlaceholderText('e.g. Roman Imperial');
      const eraField = eraInput.closest('.autocomplete-field') as HTMLElement;
      fireEvent.click(eraInput);
      fireEvent.mouseDown(within(eraField).getByRole('option', { name: 'Roman Imperial' }));

      expect(window.electronAPI.incrementVocabUsage).toHaveBeenCalledWith('era', 'Roman Imperial');
    });

    it('calls incrementVocabUsage when an existing metal option is selected', async () => {
      (window.electronAPI.getVocab as ReturnType<typeof vi.fn>).mockResolvedValue(['Silver', 'Gold']);
      renderForm(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);

      // Flush async vocab loading before opening dropdown
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

      const metalInput = screen.getByPlaceholderText('e.g. Silver');
      const metalField = metalInput.closest('.autocomplete-field') as HTMLElement;
      fireEvent.click(metalInput);
      fireEvent.mouseDown(within(metalField).getByRole('option', { name: 'Silver' }));

      expect(window.electronAPI.incrementVocabUsage).toHaveBeenCalledWith('metal', 'Silver');
    });
  });

  describe('A-02 — aria-required on mandatory inputs', () => {
    it('title input has aria-required="true"', () => {
      renderForm(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      const titleInput = screen.getByPlaceholderText('Designation');
      expect(titleInput).toHaveAttribute('aria-required', 'true');
    });

    it('era AutocompleteField inner input has aria-required="true"', () => {
      renderForm(<LedgerForm formData={baseFormData} errors={{}} updateField={updateField} />);
      const eraInput = screen.getByPlaceholderText('e.g. Roman Imperial');
      expect(eraInput).toHaveAttribute('aria-required', 'true');
    });
  });
});
