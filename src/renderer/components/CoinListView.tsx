import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CoinWithPrimaryImage } from '../../common/types';
import { useFieldVisibility } from '../hooks/useFieldVisibility';

interface CoinListViewProps {
  coins: CoinWithPrimaryImage[];
  loading: boolean;
  selected: Set<number>;
  onToggleSelect: (id: number, shiftKey: boolean) => void;
  onSelectAll: (ids: number[]) => void;
  onClearAll: () => void;
}

type SortColumn =
  | 'title'
  | 'issuer'
  | 'denomination'
  | 'era'
  | 'year_display'
  | 'mint'
  | 'metal'
  | 'grade'
  | 'catalog_ref'
  | null;

type SortDirection = 'asc' | 'desc' | 'none';

function nextDirection(current: SortDirection): SortDirection {
  if (current === 'none') return 'asc';
  if (current === 'asc') return 'desc';
  return 'none';
}

export const CoinListView: React.FC<CoinListViewProps> = ({
  coins,
  loading,
  selected,
  onToggleSelect,
  onSelectAll,
  onClearAll,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isVisible } = useFieldVisibility();

  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('none');

  const mirrorRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);

  // Keep mirror spacer width in sync with table width
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const spacer = spacerRef.current;
    if (!wrapper || !spacer) return;

    const observer = new ResizeObserver(() => {
      spacer.style.width = `${wrapper.scrollWidth}px`;
    });
    observer.observe(wrapper);
    spacer.style.width = `${wrapper.scrollWidth}px`;
    return () => observer.disconnect();
  }, []);

  // Sync scroll between mirror and wrapper
  useEffect(() => {
    const mirror = mirrorRef.current;
    const wrapper = wrapperRef.current;
    if (!mirror || !wrapper) return;

    const onMirrorScroll = () => { wrapper.scrollLeft = mirror.scrollLeft; };
    const onWrapperScroll = () => { mirror.scrollLeft = wrapper.scrollLeft; };

    mirror.addEventListener('scroll', onMirrorScroll);
    wrapper.addEventListener('scroll', onWrapperScroll);
    return () => {
      mirror.removeEventListener('scroll', onMirrorScroll);
      wrapper.removeEventListener('scroll', onWrapperScroll);
    };
  }, []);

  const handleSortColumn = useCallback((col: NonNullable<SortColumn>) => {
    if (sortColumn !== col) {
      setSortColumn(col);
      setSortDirection('asc');
    } else {
      const next = nextDirection(sortDirection);
      setSortDirection(next);
      if (next === 'none') setSortColumn(null);
    }
  }, [sortColumn, sortDirection]);

  const sortedCoins = useMemo(() => {
    if (sortColumn === null || sortDirection === 'none') return coins;
    return [...coins].sort((a, b) => {
      const aVal = (a[sortColumn as keyof CoinWithPrimaryImage] ?? '') as string;
      const bVal = (b[sortColumn as keyof CoinWithPrimaryImage] ?? '') as string;
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [coins, sortColumn, sortDirection]);

  const allIds = useMemo(() => sortedCoins.map(c => c.id), [sortedCoins]);

  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const someSelected = allIds.some(id => selected.has(id));
  const headerIndeterminate = someSelected && !allSelected;

  const handleHeaderCheckboxChange = () => {
    if (allSelected) {
      onClearAll();
    } else {
      onSelectAll(allIds);
    }
  };

  const ariaSortFor = (col: NonNullable<SortColumn>): React.AriaAttributes['aria-sort'] => {
    if (sortColumn !== col || sortDirection === 'none') return 'none';
    return sortDirection === 'asc' ? 'ascending' : 'descending';
  };

  const renderSortableHeader = (col: NonNullable<SortColumn>, label: string) => (
    <th key={col} aria-sort={ariaSortFor(col)}>
      <button
        className="coin-list-sort-btn"
        onClick={() => handleSortColumn(col)}
        type="button"
      >
        {label}
        {sortColumn === col && sortDirection !== 'none' ? (
          <span aria-hidden="true">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
        ) : (
          <span className="coin-list-sort-inactive" aria-hidden="true"> ⇅</span>
        )}
      </button>
    </th>
  );

  if (loading) {
    return (
      <div className="gallery-status">
        <p>{t('gallery.loading')}</p>
      </div>
    );
  }

  return (
    <div className="coin-list-view-outer">
      <div className="coin-list-view-mirror" ref={mirrorRef} aria-hidden="true">
        <div ref={spacerRef} style={{ height: 1 }} />
      </div>
      <div className="coin-list-view-wrapper" ref={wrapperRef}>
      <table className="coin-list-view">
        <thead>
          <tr>
            <th className="coin-list-col-checkbox">
              <input
                type="checkbox"
                aria-label={allSelected ? t('cabinet.deselectAll') : t('cabinet.selectAll')}
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = headerIndeterminate; }}
                onChange={handleHeaderCheckboxChange}
              />
            </th>
            <th className="coin-list-col-thumbnail" aria-label="Image" />
            {renderSortableHeader('title', t('ledger.designation'))}
            {isVisible('ledger.issuer') && renderSortableHeader('issuer', t('ledger.issuer'))}
            {isVisible('ledger.denomination') && renderSortableHeader('denomination', t('ledger.denomination'))}
            {isVisible('ledger.era') && renderSortableHeader('era', t('ledger.era'))}
            {isVisible('ledger.year') && renderSortableHeader('year_display', t('ledger.year'))}
            {isVisible('ledger.mint') && renderSortableHeader('mint', t('ledger.mintedAt'))}
            {isVisible('ledger.metal') && renderSortableHeader('metal', t('ledger.material'))}
            {isVisible('ledger.grade') && renderSortableHeader('grade', t('ledger.grade'))}
            {isVisible('ledger.catalog_ref') && renderSortableHeader('catalog_ref', t('ledger.reference'))}
          </tr>
        </thead>
        <tbody>
          {sortedCoins.map(coin => {
            const isRowSelected = selected.has(coin.id);
            return (
              <tr
                key={coin.id}
                className={`coin-row${isRowSelected ? ' coin-row--selected' : ''}`}
                onClick={() => navigate(`/coin/${coin.id}`)}
              >
                <td className="coin-list-col-checkbox" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isRowSelected}
                    aria-label={t('cabinet.selectCoin', { title: coin.title })}
                    onChange={(e) => {
                      onToggleSelect(coin.id, (e.nativeEvent as MouseEvent).shiftKey);
                    }}
                  />
                </td>
                <td className="coin-list-col-thumbnail">
                  {coin.primary_image_path ? (
                    <img
                      src={`patina-img://${coin.primary_image_path}`}
                      alt={coin.title}
                      className="coin-row-thumbnail"
                      loading="lazy"
                    />
                  ) : (
                    <div className="coin-row-no-image" aria-hidden="true" />
                  )}
                </td>
                <td>{coin.title}</td>
                {isVisible('ledger.issuer') && <td>{coin.issuer || '—'}</td>}
                {isVisible('ledger.denomination') && <td>{coin.denomination || '—'}</td>}
                {isVisible('ledger.era') && <td>{coin.era || '—'}</td>}
                {isVisible('ledger.year') && <td>{coin.year_display || '—'}</td>}
                {isVisible('ledger.mint') && <td>{coin.mint || '—'}</td>}
                {isVisible('ledger.metal') && <td>{coin.metal || '—'}</td>}
                {isVisible('ledger.grade') && <td>{coin.grade || '—'}</td>}
                {isVisible('ledger.catalog_ref') && <td>{coin.catalog_ref || '—'}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
};

CoinListView.displayName = 'CoinListView';
