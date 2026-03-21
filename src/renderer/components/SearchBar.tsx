import React from 'react';
import { useTranslation } from 'react-i18next';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * SearchBar Component
 * A minimalist, underlined input field for real-time archive filtering.
 * Adheres to the "Archival Ledger" aesthetic from the Manuscript Hybrid (v3.3) guide.
 */
export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder }) => {
  const { t } = useTranslation();

  return (
    <div className="search-bar-container">
      <input
        type="text"
        className="search-input"
        placeholder={placeholder || t('cabinet.search')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={100}
        aria-label="Search the coin archive"
      />
    </div>
  );
};
