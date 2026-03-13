import React from 'react';

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
  return (
    <div className="search-bar-container">
      <label className="type-meta search-label">Search the Ledger</label>
      <input
        type="text"
        className="search-input"
        placeholder={placeholder || "Title, issuer, or catalog reference..."}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={100}
        aria-label="Search the coin archive"
      />
    </div>
  );
};
