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
    </aside>
  );
};
