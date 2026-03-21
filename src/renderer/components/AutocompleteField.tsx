import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { VocabField } from '../../common/validation';

interface AutocompleteFieldProps {
  field: VocabField;
  value: string;
  onChange: (value: string) => void;
  onAddNew: (value: string) => void;
  options: string[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  onReset?: () => void;
  hasUserValues?: boolean;
}

export const AutocompleteField: React.FC<AutocompleteFieldProps> = ({
  field: _field,
  value,
  onChange,
  onAddNew,
  options,
  placeholder,
  onReset,
  hasUserValues,
}) => {
  const { t } = useTranslation();
  const id = useId();
  const listboxId = `autocomplete-listbox-${id}`;

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync inputValue when controlled value changes externally
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const filteredOptions = inputValue
    ? options.filter(opt => opt.toLowerCase().includes(inputValue.toLowerCase()))
    : options;

  const showAddNew =
    inputValue.trim().length > 0 &&
    !options.some(opt => opt.toLowerCase() === inputValue.trim().toLowerCase());

  // Total navigable items: filteredOptions + optional add-new
  const totalItems = filteredOptions.length + (showAddNew ? 1 : 0);

  const open = useCallback(() => {
    setIsOpen(true);
    setActiveIndex(-1);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  const selectOption = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setInputValue(optionValue);
      close();
    },
    [onChange, close],
  );

  const handleAddNew = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      onAddNew(trimmed);
      onChange(trimmed);
      setInputValue(trimmed);
      close();
    }
  }, [inputValue, onAddNew, onChange, close]);

  // Scroll close: attach listener to nearest scrollable ancestor
  useEffect(() => {
    if (!isOpen) return;
    const scrollable = findScrollableAncestor(containerRef.current);
    if (!scrollable) return;
    const handler = () => close();
    scrollable.addEventListener('scroll', handler, { passive: true });
    return () => scrollable.removeEventListener('scroll', handler);
  }, [isOpen, close]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        open();
        setActiveIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        setActiveIndex(prev => {
          if (prev < 0) return 0;
          // Regular options wrap among themselves; add-new is one beyond last
          const nextRegular = (prev + 1) % filteredOptions.length;
          if (prev === filteredOptions.length - 1 && showAddNew) {
            return filteredOptions.length; // add-new index
          }
          if (prev >= filteredOptions.length) {
            return 0; // wrap from add-new to first
          }
          return nextRegular;
        });
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        setActiveIndex(prev => {
          if (prev <= 0) return filteredOptions.length - 1; // wrap to last regular
          return prev - 1;
        });
        break;
      }
      case 'Enter': {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          selectOption(filteredOptions[activeIndex]);
        } else if (activeIndex === filteredOptions.length && showAddNew) {
          handleAddNew();
        }
        break;
      }
      case 'Escape': {
        e.preventDefault();
        close();
        inputRef.current?.focus();
        break;
      }
      case 'Tab': {
        close();
        break;
      }
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Close if focus moves outside the component
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      close();
    }
  };

  const activeDescendant =
    activeIndex >= 0 && activeIndex < filteredOptions.length
      ? `autocomplete-option-${id}-${activeIndex}`
      : activeIndex === filteredOptions.length && showAddNew
        ? `autocomplete-option-${id}-add-new`
        : undefined;

  return (
    <div
      ref={containerRef}
      className="autocomplete-field"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      aria-owns={listboxId}
      onBlur={handleBlur}
    >
      <input
        ref={inputRef}
        type="text"
        className="autocomplete-input"
        placeholder={placeholder}
        value={inputValue}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
        onChange={e => {
          setInputValue(e.target.value);
          if (!isOpen) open();
          setActiveIndex(-1);
        }}
        onClick={() => {
          if (!isOpen) open();
        }}
        onKeyDown={handleKeyDown}
      />
      <span className={`autocomplete-chevron${isOpen ? ' open' : ''}`} aria-hidden>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      <ul
        id={listboxId}
        role="listbox"
        aria-label={`${placeholder || 'field'} options`}
        className={`autocomplete-dropdown${isOpen ? ' open' : ''}`}
      >
        {filteredOptions.map((opt, index) => (
          <li
            key={opt}
            id={`autocomplete-option-${id}-${index}`}
            role="option"
            aria-selected={opt.toLowerCase() === value.toLowerCase()}
            className={[
              'autocomplete-option',
              index === activeIndex ? 'autocomplete-option--active' : '',
              opt.toLowerCase() === value.toLowerCase() ? 'autocomplete-option--selected' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onMouseDown={e => {
              e.preventDefault(); // prevent blur before click
              selectOption(opt);
            }}
          >
            {opt}
          </li>
        ))}

        {showAddNew && (
          <li
            id={`autocomplete-option-${id}-add-new`}
            role="option"
            aria-selected={false}
            aria-label={`Add new value: ${inputValue.trim()}`}
            data-action="add-new"
            className={[
              'autocomplete-option autocomplete-option--add-new',
              activeIndex === filteredOptions.length ? 'autocomplete-option--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onMouseDown={e => {
              e.preventDefault();
              handleAddNew();
            }}
          >
            {t('autocomplete.addNew', { value: inputValue.trim() })}
          </li>
        )}

        {onReset && hasUserValues && (
          <li role="presentation" className="autocomplete-reset-separator">
            <button
              type="button"
              className="autocomplete-reset-btn"
              onMouseDown={e => {
                e.preventDefault();
                onReset();
                close();
              }}
            >
              {t('autocomplete.resetToDefaults')}
            </button>
          </li>
        )}
      </ul>
    </div>
  );
};

function findScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const { overflow, overflowY } = window.getComputedStyle(node);
    if (/auto|scroll/.test(overflow) || /auto|scroll/.test(overflowY)) {
      return node;
    }
    node = node.parentElement;
  }
  return document.documentElement;
}
