import React from 'react';
import { useTranslation } from 'react-i18next';
import { FilterState } from '../../common/validation';
import { LanguageSelector } from './LanguageSelector';

interface PatinaSidebarProps {
  filters: FilterState;
  updateFilters: (updates: Partial<FilterState>) => void;
  clearFilters: () => void;
  availableMetals: string[];
  availableGrades: string[];
}

const ERAS = [
  { value: 'Ancient',  labelKey: 'sidebar.era.ancient'  },
  { value: 'Medieval', labelKey: 'sidebar.era.medieval' },
  { value: 'Modern',   labelKey: 'sidebar.era.modern'   },
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
  const { t } = useTranslation();

  const SORT_OPTIONS = [
    { label: t('sidebar.sort.year'),     value: 'year_numeric'  },
    { label: t('sidebar.sort.title'),    value: 'title'         },
    { label: t('sidebar.sort.acquired'), value: 'purchase_date' },
  ] as const;

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
        <span className="type-meta filter-label">{t('sidebar.orderBy')}</span>
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
            {t('sidebar.asc')}
          </button>
          <button
            className={`dir-btn ${!filters.sortAsc ? 'active' : ''}`}
            onClick={() => updateFilters({ sortAsc: false })}
            aria-pressed={!filters.sortAsc}
          >
            {t('sidebar.desc')}
          </button>
        </div>
      </div>

      <div className="filter-group">
        <span className="type-meta filter-label">{t('sidebar.eras')}</span>
        <ul className="filter-list">
          {ERAS.map(({ value, labelKey }) => (
            <li key={value}>
              <label className={`filter-item-label ${isSelected('era', value) ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  className="filter-input"
                  checked={isSelected('era', value)}
                  onChange={() => toggleFilter('era', value)}
                  aria-label={`Filter by ${t(labelKey)} era`}
                />
                <span className="filter-checkbox" aria-hidden="true"></span>
                <span className="filter-text">{t(labelKey)}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="filter-group">
        <span className="type-meta filter-label">{t('sidebar.metals')}</span>
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
            <li className="filter-item disabled">{t('sidebar.noMetals')}</li>
          )}
        </ul>
      </div>

      <div className="filter-group">
        <span className="type-meta filter-label">{t('sidebar.grade')}</span>
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
            <li className="filter-item disabled">{t('sidebar.noGrades')}</li>
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
          {t('sidebar.reset')}
        </button>
        <LanguageSelector />
      </div>
    </aside>
  );
};
