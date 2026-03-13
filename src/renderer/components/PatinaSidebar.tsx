import React from 'react';
import { FilterState } from '../../common/validation';

interface PatinaSidebarProps {
  filters: FilterState;
  updateFilters: (updates: Partial<FilterState>) => void;
  clearFilters: () => void;
  availableMetals: string[];
}

const ERAS = ['Ancient', 'Medieval', 'Modern'] as const;

/**
 * PatinaSidebar Component
 * The "Archive Explorer" providing navigation via multi-select filters.
 * Fixed 280px width, adhering to the Manuscript Hybrid (v3.3) guide.
 */
export const PatinaSidebar: React.FC<PatinaSidebarProps> = ({ 
  filters, 
  updateFilters, 
  clearFilters, 
  availableMetals 
}) => {

  const toggleFilter = (key: 'era' | 'metal', value: string) => {
    const current = filters[key] as string[];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    
    updateFilters({ [key]: updated });
  };

  const isSelected = (key: 'era' | 'metal', value: string) => {
    return (filters[key] as string[]).includes(value);
  };

  return (
    <aside className="patina-sidebar">
      <div className="filter-group">
        <label className="type-meta filter-label">Eras</label>
        <ul className="filter-list">
          {ERAS.map(era => (
            <li 
              key={era} 
              className={`filter-item ${isSelected('era', era) ? 'active' : ''}`}
              onClick={() => toggleFilter('era', era)}
            >
              {era}
            </li>
          ))}
        </ul>
      </div>

      <div className="filter-group">
        <label className="type-meta filter-label">Metals</label>
        <ul className="filter-list">
          {availableMetals.length > 0 ? (
            availableMetals.map(metal => (
              <li 
                key={metal} 
                className={`filter-item ${isSelected('metal', metal) ? 'active' : ''}`}
                onClick={() => toggleFilter('metal', metal)}
              >
                {metal.toUpperCase()}
              </li>
            ))
          ) : (
            <li className="filter-item disabled">No metals indexed</li>
          )}
        </ul>
      </div>

      <div className="sidebar-footer">
        <button 
          className="btn-minimal reset-btn" 
          onClick={clearFilters}
          disabled={filters.era.length === 0 && filters.metal.length === 0 && !filters.searchTerm}
        >
          Reset Archive View
        </button>
      </div>

      <style jsx>{`
        .patina-sidebar {
          width: 280px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 3rem;
          padding-right: 2rem;
          border-right: 1px solid var(--border-hairline);
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }

        .filter-label {
          display: block;
        }

        .filter-list {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .filter-item {
          font-family: var(--font-sans);
          font-size: 0.95rem;
          color: var(--text-ink);
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 0.4rem 0.6rem;
          margin-left: -0.6rem;
          border-left: 2px solid transparent;
        }

        .filter-item:hover {
          color: var(--accent-manuscript);
          background: var(--stone-pedestal);
        }

        .filter-item.active {
          color: var(--accent-manuscript);
          font-weight: 600;
          border-left: 2px solid var(--accent-manuscript);
          background: var(--stone-pedestal);
        }

        .filter-item.disabled {
          color: var(--text-muted);
          font-style: italic;
          cursor: default;
        }

        .filter-item.disabled:hover {
          background: none;
        }

        .sidebar-footer {
          margin-top: auto;
          padding-top: 2rem;
        }

        .reset-btn {
          width: fit-content;
        }

        .reset-btn:disabled {
          opacity: 0.3;
          cursor: default;
          border-color: var(--text-muted);
          color: var(--text-muted);
        }
      `}</style>
    </aside>
  );
};
