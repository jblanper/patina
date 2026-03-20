import React from 'react';
import { FilterState } from '../../common/validation';

interface PatinaSidebarProps {
  filters: FilterState;
  updateFilters: (updates: Partial<FilterState>) => void;
  clearFilters: () => void;
  availableMetals: string[];
  availableGrades: string[];
}

const ERAS = ['Ancient', 'Medieval', 'Modern'] as const;

const SORT_OPTIONS = [
  { label: 'Year',     value: 'year_numeric'  },
  { label: 'Title',    value: 'title'         },
  { label: 'Acquired', value: 'purchase_date' },
] as const;

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
  availableMetals,
  availableGrades
}) => {

  const toggleFilter = (key: 'era' | 'metal' | 'grade', value: string) => {
    const current = filters[key] as string[];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];

    updateFilters({ [key]: updated });
  };

  const isSelected = (key: 'era' | 'metal' | 'grade', value: string) => {
    return (filters[key] as string[]).includes(value);
  };

  return (
    <aside className="patina-sidebar">
      {/* Sort Controls — Path B "The Ledger" */}
      <div className="filter-group">
        <span className="type-meta filter-label">Order By</span>
        <ul className="filter-list">
          {SORT_OPTIONS.map(({ label, value }) => (
            <li key={value}>
              <label
                className={`filter-item-label ${filters.sortBy === value ? 'active' : ''}`}
                onClick={() => updateFilters({ sortBy: value })}
              >
                <span className="filter-radio" aria-hidden="true"></span>
                <span className="filter-text">{label}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="sort-dir-toggle">
          <button
            className={`dir-btn ${filters.sortAsc ? 'active' : ''}`}
            onClick={() => updateFilters({ sortAsc: true })}
            aria-pressed={filters.sortAsc}
          >
            ↑ Asc
          </button>
          <button
            className={`dir-btn ${!filters.sortAsc ? 'active' : ''}`}
            onClick={() => updateFilters({ sortAsc: false })}
            aria-pressed={!filters.sortAsc}
          >
            ↓ Desc
          </button>
        </div>
      </div>

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

      <div className="filter-group">
        <span className="type-meta filter-label">Grade</span>
        <ul className="filter-list">
          {availableGrades.length > 0 ? (
            availableGrades.map(grade => (
              <li key={grade}>
                <label className={`filter-item-label ${isSelected('grade', grade) ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    className="filter-input"
                    checked={isSelected('grade', grade)}
                    onChange={() => toggleFilter('grade', grade)}
                    aria-label={`Filter by grade ${grade}`}
                  />
                  <span className="filter-checkbox" aria-hidden="true"></span>
                  <span className="filter-text">{grade}</span>
                </label>
              </li>
            ))
          ) : (
            <li className="filter-item disabled">No grades recorded</li>
          )}
        </ul>
      </div>

      <div className="sidebar-footer">
        <button
          className="btn-minimal reset-btn"
          onClick={clearFilters}
          disabled={
            filters.era.length === 0 &&
            filters.metal.length === 0 &&
            filters.grade.length === 0 &&
            !filters.searchTerm
          }
        >
          Reset Archive View
        </button>
      </div>
    </aside>
  );
};
