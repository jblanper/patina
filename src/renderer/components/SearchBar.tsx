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

      <style jsx>{`
        .search-bar-container {
          width: 100%;
          margin-bottom: 2.5rem;
        }

        .search-label {
          display: block;
          margin-bottom: 0.5rem;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 0;
          border: none;
          border-bottom: 1px solid var(--border-hairline);
          font-family: var(--font-sans);
          font-size: 1.1rem;
          outline: none;
          background: transparent;
          color: var(--text-ink);
          transition: border-color 0.3s ease, border-width 0.1s ease;
        }

        .search-input:focus {
          border-bottom: 2px solid var(--text-ink);
          padding-bottom: calc(0.75rem - 1px); /* Prevent layout shift from 2px border */
        }

        .search-input::placeholder {
          color: var(--text-muted);
          font-style: italic;
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
};
