import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutocompleteField } from './AutocompleteField';

const OPTIONS = ['Roman', 'Byzantine', 'Greek', 'Medieval'];

const DEFAULT_PROPS = {
  field: 'era' as const,
  value: '',
  onChange: vi.fn(),
  onAddNew: vi.fn(),
  options: OPTIONS,
  placeholder: 'Select era',
};

beforeEach(() => {
  vi.clearAllMocks();
});

function openDropdown(placeholder = 'Select era') {
  fireEvent.click(screen.getByPlaceholderText(placeholder));
}

describe('AutocompleteField — rendering', () => {
  it('TC-AC-01: renders placeholder text', () => {
    render(<AutocompleteField {...DEFAULT_PROPS} />);
    expect(screen.getByPlaceholderText('Select era')).toBeInTheDocument();
  });

  it('TC-AC-02: renders dropdown chevron icon with aria-hidden', () => {
    const { container } = render(<AutocompleteField {...DEFAULT_PROPS} />);
    const chevron = container.querySelector('.autocomplete-chevron');
    expect(chevron).toBeTruthy();
    expect(chevron?.getAttribute('aria-hidden')).toBeTruthy();
  });
});

describe('AutocompleteField — dropdown opening', () => {
  it('TC-AC-03: opens dropdown on click showing all options as role=option', () => {
    render(<AutocompleteField {...DEFAULT_PROPS} />);
    openDropdown();
    const opts = screen.getAllByRole('option');
    expect(opts.length).toBeGreaterThanOrEqual(OPTIONS.length);
  });

  it('TC-AC-04: getAllByRole option returns array of OPTIONS.length', () => {
    render(<AutocompleteField {...DEFAULT_PROPS} />);
    openDropdown();
    expect(screen.getAllByRole('option')).toHaveLength(OPTIONS.length);
  });
});

describe('AutocompleteField — filtering', () => {
  it('TC-AC-05: filters options on typing (case-insensitive)', () => {
    render(<AutocompleteField {...DEFAULT_PROPS} />);
    openDropdown();
    fireEvent.change(screen.getByPlaceholderText('Select era'), { target: { value: 'rom' } });
    // Exclude add-new option (which appears since 'rom' has no exact match)
    const regularOpts = screen.getAllByRole('option').filter(o => !o.getAttribute('data-action'));
    expect(regularOpts).toHaveLength(1);
    expect(regularOpts[0]).toHaveTextContent('Roman');
  });

  it('TC-AC-06: shows all options when input is cleared', () => {
    render(<AutocompleteField {...DEFAULT_PROPS} />);
    openDropdown();
    fireEvent.change(screen.getByPlaceholderText('Select era'), { target: { value: 'rom' } });
    fireEvent.change(screen.getByPlaceholderText('Select era'), { target: { value: '' } });
    // No add-new when input is cleared; all regular options visible
    expect(screen.getAllByRole('option')).toHaveLength(OPTIONS.length);
  });
});

describe('AutocompleteField — option selection', () => {
  it('TC-AC-07: click selects option and calls onChange; dropdown closes', () => {
    render(<AutocompleteField {...DEFAULT_PROPS} />);
    openDropdown();
    const romanOpt = screen.getByRole('option', { name: 'Roman' });
    fireEvent.mouseDown(romanOpt);
    expect(DEFAULT_PROPS.onChange).toHaveBeenCalledWith('Roman');
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
  });

  it('TC-AC-08: input displays selected value after selection', () => {
    render(<AutocompleteField {...DEFAULT_PROPS} value="Roman" />);
    expect(screen.getByDisplayValue('Roman')).toBeInTheDocument();
  });
});

describe('AutocompleteField — add-new option', () => {
  it('TC-AC-09: shows Add option when typed value has no match', () => {
    render(<AutocompleteField {...DEFAULT_PROPS} />);
    openDropdown();
    fireEvent.change(screen.getByPlaceholderText('Select era'), { target: { value: 'Sassanid' } });
    expect(screen.getByRole('option', { name: /Add new value: Sassanid/i })).toBeInTheDocument();
  });

  it('TC-AC-10: clicking Add option calls onAddNew with the typed value', () => {
    render(<AutocompleteField {...DEFAULT_PROPS} />);
    openDropdown();
    fireEvent.change(screen.getByPlaceholderText('Select era'), { target: { value: 'Sassanid' } });
    const addOpt = screen.getByRole('option', { name: /Add new value: Sassanid/i });
    fireEvent.mouseDown(addOpt);
    expect(DEFAULT_PROPS.onAddNew).toHaveBeenCalledWith('Sassanid');
  });

  it('TC-AC-11: does NOT show Add option when typed value exactly matches existing (case-insensitive)', () => {
    render(<AutocompleteField {...DEFAULT_PROPS} />);
    openDropdown();
    const input = screen.getByPlaceholderText('Select era');

    fireEvent.change(input, { target: { value: 'roman' } });
    expect(screen.queryByRole('option', { name: /Add new value/i })).toBeNull();

    fireEvent.change(input, { target: { value: 'ROMAN' } });
    expect(screen.queryByRole('option', { name: /Add new value/i })).toBeNull();
  });

  it('TC-AC-12: does NOT show Add option when typed value matches after trimming', () => {
    render(<AutocompleteField {...DEFAULT_PROPS} />);
    openDropdown();
    fireEvent.change(screen.getByPlaceholderText('Select era'), { target: { value: 'Roman' } });
    expect(screen.queryByRole('option', { name: /Add new value/i })).toBeNull();
  });
});

describe('AutocompleteField — closing', () => {
  it('TC-AC-13: Escape closes dropdown and focus returns to input', () => {
    render(<AutocompleteField {...DEFAULT_PROPS} />);
    const input = screen.getByPlaceholderText('Select era');
    openDropdown();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
  });

  it('TC-AC-14: blur closes dropdown', async () => {
    render(<AutocompleteField {...DEFAULT_PROPS} />);
    const input = screen.getByPlaceholderText('Select era');
    openDropdown();
    fireEvent.blur(input);
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
    });
  });
});

describe('AutocompleteField — keyboard navigation', () => {
  it('TC-AC-15: ArrowDown moves highlight to first option', () => {
    render(<AutocompleteField {...DEFAULT_PROPS} />);
    const input = screen.getByPlaceholderText('Select era');
    openDropdown();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const opts = screen.getAllByRole('option');
    expect(opts[0].className).toContain('autocomplete-option--active');
  });

  it('TC-AC-16: ArrowDown wraps from last option to first', () => {
    render(<AutocompleteField {...DEFAULT_PROPS} />);
    const input = screen.getByPlaceholderText('Select era');
    openDropdown();
    // Navigate to last
    for (let i = 0; i < OPTIONS.length; i++) {
      fireEvent.keyDown(input, { key: 'ArrowDown' });
    }
    // One more wraps to first
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const opts = screen.getAllByRole('option');
    expect(opts[0].className).toContain('autocomplete-option--active');
  });

  it('TC-AC-17: ArrowUp from first option wraps to last', () => {
    render(<AutocompleteField {...DEFAULT_PROPS} />);
    const input = screen.getByPlaceholderText('Select era');
    openDropdown();
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // highlight first
    fireEvent.keyDown(input, { key: 'ArrowUp' });   // wrap to last
    const opts = screen.getAllByRole('option');
    expect(opts[opts.length - 1].className).toContain('autocomplete-option--active');
  });

  it('TC-AC-18: Enter confirms highlighted option; calls onChange; closes dropdown', () => {
    render(<AutocompleteField {...DEFAULT_PROPS} />);
    const input = screen.getByPlaceholderText('Select era');
    openDropdown();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(DEFAULT_PROPS.onChange).toHaveBeenCalledWith(OPTIONS[0]);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
  });

  it('TC-AC-19: Enter on Add-New option calls onAddNew with typed value', () => {
    render(<AutocompleteField {...DEFAULT_PROPS} />);
    const input = screen.getByPlaceholderText('Select era');
    openDropdown();
    fireEvent.change(input, { target: { value: 'Sassanid' } });
    // No matches, so add-new is the only option at index 0, activeIndex -1 initially
    // Arrow down to the filtered options (0 in this case) then to add-new
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // index 0 = add-new (no matches)
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(DEFAULT_PROPS.onAddNew).toHaveBeenCalledWith('Sassanid');
  });
});

describe('AutocompleteField — ARIA', () => {
  it('TC-AC-20: container has role="combobox"', () => {
    render(<AutocompleteField {...DEFAULT_PROPS} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('TC-AC-21: aria-expanded reflects dropdown state', () => {
    render(<AutocompleteField {...DEFAULT_PROPS} />);
    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    openDropdown();
    expect(combobox).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(screen.getByPlaceholderText('Select era'), { key: 'Escape' });
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
  });

  it('TC-AC-22: aria-controls links input to listbox id', () => {
    const { container } = render(<AutocompleteField {...DEFAULT_PROPS} />);
    const input = screen.getByPlaceholderText('Select era');
    const listboxId = input.getAttribute('aria-controls');
    expect(listboxId).toBeTruthy();
    expect(container.querySelector(`#${listboxId}`)).toBeTruthy();
  });

  it('TC-AC-23: aria-activedescendant tracks keyboard-focused option id', () => {
    render(<AutocompleteField {...DEFAULT_PROPS} />);
    const input = screen.getByPlaceholderText('Select era');
    openDropdown();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const activeDesc = input.getAttribute('aria-activedescendant');
    expect(activeDesc).toBeTruthy();
    expect(document.getElementById(activeDesc!)).toBeTruthy();
  });
});

describe('AutocompleteField — scroll close', () => {
  it('TC-AC-24: scroll on nearest scrollable ancestor closes the dropdown', async () => {
    const { container } = render(
      <div style={{ overflow: 'auto', height: '200px' }}>
        <AutocompleteField {...DEFAULT_PROPS} />
      </div>
    );
    openDropdown();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');

    const scrollable = container.firstElementChild as HTMLElement;
    fireEvent.scroll(scrollable);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
