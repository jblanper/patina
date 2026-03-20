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
 * Filters use checkbox controls for clear selection state indication.
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
        <span className="type-meta filter-label">Eras</span>
        <ul className="filter-list">
          {ERAS.map(era => (
            <li key={era}>
              <label className={`filter-item-label ${isSelected('era', era) ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  className="filter-input"
                  checked={isSelected('era', era)}
                  onChange={() => toggleFilter('era', era)}
                  aria-label={`Filter by ${era} era`}
                />
                <span className="filter-checkbox" aria-hidden="true"></span>
                <span className="filter-text">{era}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="filter-group">
        <span className="type-meta filter-label">Metals</span>
        <ul className="filter-list">
          {availableMetals.length > 0 ? (
            availableMetals.map(metal => (
              <li key={metal}>
                <label className={`filter-item-label ${isSelected('metal', metal) ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    className="filter-input"
                    checked={isSelected('metal', metal)}
                    onChange={() => toggleFilter('metal', metal)}
                    aria-label={`Filter by ${metal} metal`}
                  />
                  <span className="filter-checkbox" aria-hidden="true"></span>
                  <span className="filter-text">{metal.toUpperCase()}</span>
                </label>
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
    </aside>
  );
};
