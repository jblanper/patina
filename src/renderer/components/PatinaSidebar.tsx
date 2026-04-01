import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FilterState } from '../../common/validation';
import { LanguageSelector } from './LanguageSelector';

interface PatinaSidebarProps {
  filters: FilterState;
  updateFilters: (updates: Partial<FilterState>) => void;
  clearFilters: () => void;
  availableMetals: string[];
  availableGrades: string[];
  availableEras: string[];
}

const TRUNCATION_THRESHOLD = 8;

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
  availableGrades,
  availableEras
}) => {
  const { t } = useTranslation();

  const [erasExpanded,   setErasExpanded]   = useState(false);
  const [metalsExpanded, setMetalsExpanded] = useState(false);
  const [gradeExpanded,  setGradeExpanded]  = useState(false);

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

  const renderOverflowGroup = (
    key: 'era' | 'metal' | 'grade',
    values: string[],
    expanded: boolean,
    setExpanded: (v: boolean) => void,
    ariaLabel: (v: string) => string
  ) => {
    const active   = values.filter(v => isSelected(key, v));
    const inactive = values.filter(v => !isSelected(key, v));
    const ordered  = [...active, ...inactive];

    const shouldTruncate = ordered.length > TRUNCATION_THRESHOLD;
    const visible        = shouldTruncate && !expanded
      ? ordered.slice(0, TRUNCATION_THRESHOLD)
      : ordered;
    const hiddenCount    = ordered.length - TRUNCATION_THRESHOLD;

    return (
      <>
        <div className={`filter-overflow-wrap${shouldTruncate && !expanded ? ' truncated' : ''}`}>
          <ul className="filter-list">
            {visible.map(value => (
              <li key={value}>
                <label className={`filter-item-label ${isSelected(key, value) ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    className="filter-input"
                    checked={isSelected(key, value)}
                    onChange={() => toggleFilter(key, value)}
                    aria-label={ariaLabel(value)}
                  />
                  <span className="filter-checkbox" aria-hidden="true"></span>
                  <span className="filter-text">{key === 'metal' ? value.toUpperCase() : value}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
        {shouldTruncate && (
          <button
            className="filter-show-more"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            {expanded ? t('sidebar.showLess') : t('sidebar.showMore', { count: hiddenCount })}
          </button>
        )}
      </>
    );
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
        {availableEras.length > 0 ? (
          renderOverflowGroup(
            'era',
            availableEras,
            erasExpanded,
            setErasExpanded,
            v => `Filter by ${v} era`
          )
        ) : (
          <ul className="filter-list">
            <li className="filter-item disabled">{t('sidebar.noEras')}</li>
          </ul>
        )}
      </div>

      <div className="filter-group">
        <span className="type-meta filter-label">{t('sidebar.metals')}</span>
        {availableMetals.length > 0 ? (
          renderOverflowGroup(
            'metal',
            availableMetals,
            metalsExpanded,
            setMetalsExpanded,
            v => `Filter by ${v} metal`
          )
        ) : (
          <ul className="filter-list">
            <li className="filter-item disabled">{t('sidebar.noMetals')}</li>
          </ul>
        )}
      </div>

      <div className="filter-group">
        <span className="type-meta filter-label">{t('sidebar.grade')}</span>
        {availableGrades.length > 0 ? (
          renderOverflowGroup(
            'grade',
            availableGrades,
            gradeExpanded,
            setGradeExpanded,
            v => `Filter by grade ${v}`
          )
        ) : (
          <ul className="filter-list">
            <li className="filter-item disabled">{t('sidebar.noGrades')}</li>
          </ul>
        )}
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
