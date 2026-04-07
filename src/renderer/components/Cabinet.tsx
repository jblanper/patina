import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FieldVisibilityDrawer } from './FieldVisibilityDrawer';
import { useCoins } from '../hooks/useCoins';
import { useExport } from '../hooks/useExport';
import { useLanguage } from '../hooks/useLanguage';
import { useSelection } from '../hooks/useSelection';
import { GalleryGrid } from './GalleryGrid';
import { CoinListView } from './CoinListView';
import { PatinaSidebar } from './PatinaSidebar';
import { SearchBar } from './SearchBar';
import { ExportToast } from './ExportToast';
import { SelectionToolbar } from './SelectionToolbar';
import { BulkEditModal } from './BulkEditModal';

export const Cabinet: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    coins,
    filteredCoins,
    loading,
    error,
    filters,
    updateFilters,
    clearFilters,
    availableMetals,
    availableGrades,
    availableEras,
    deleteCoin,
    refresh,
  } = useCoins();

  const { language } = useLanguage();
  const { status, resultPath, error: exportError, exportToZip, exportToPdf, reset } = useExport();
  const { selected, toggle, toggleRange, selectAll, clearAll, count: selectionCount } = useSelection();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const lastAnchorId = useRef<number | null>(null);

  useEffect(() => {
    if (!toolsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [toolsOpen]);

  const handleToggleSelect = useCallback((id: number, shiftKey: boolean) => {
    if (shiftKey && lastAnchorId.current !== null) {
      const ids = filteredCoins.map(c => c.id);
      toggleRange(ids, lastAnchorId.current, id);
    } else {
      toggle(id);
      lastAnchorId.current = id;
    }
  }, [filteredCoins, toggle, toggleRange]);

  const handleBulkDeleteConfirm = useCallback(async () => {
    const ids = [...selected];
    for (const id of ids) {
      try {
        await deleteCoin(id);
      } catch {
        // continue deleting remaining coins
      }
    }
    clearAll();
    setBulkDeleteOpen(false);
  }, [selected, deleteCoin, clearAll]);

  const exportSelectionToZip = useCallback((ids: number[]) => {
    exportToZip(true, true, ids);
  }, [exportToZip]);

  const exportSelectionToPdf = useCallback((ids: number[]) => {
    exportToPdf(language, ids);
  }, [exportToPdf, language]);

  if (error) {
    throw error;
  }

  return (
    <>
      <header className="app-header">
        <h1>{t('cabinet.header')}</h1>
        <div className="version-tag">{t('cabinet.tagline')}</div>
      </header>

      <div className={`app-layout${sidebarOpen ? '' : ' app-layout--sidebar-collapsed'}`}>
        <PatinaSidebar
          filters={filters}
          updateFilters={updateFilters}
          clearFilters={clearFilters}
          availableMetals={availableMetals}
          availableGrades={availableGrades}
          availableEras={availableEras}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(prev => !prev)}
        />

        <main className="app-main">
          <section className="cabinet-section">
            <header className="cabinet-header">
              <div className="cabinet-toolbar">
                <button
                  className="btn-customize"
                  onClick={() => setDrawerOpen(true)}
                  aria-label={t('cabinet.customizeDisplay')}
                >
                  {t('cabinet.customizeDisplay')}
                </button>

                <div className="view-toggle" role="group" aria-label={t('cabinet.viewToggle')}>
                  <button
                    className="btn-view-mode"
                    aria-pressed={viewMode === 'grid'}
                    aria-label={t('cabinet.viewGrid')}
                    onClick={() => setViewMode('grid')}
                    type="button"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
                      <rect x="1" y="1" width="6" height="6" rx="1" />
                      <rect x="9" y="1" width="6" height="6" rx="1" />
                      <rect x="1" y="9" width="6" height="6" rx="1" />
                      <rect x="9" y="9" width="6" height="6" rx="1" />
                    </svg>
                    <span className="sr-only">{t('cabinet.viewGrid')}</span>
                  </button>
                  <button
                    className="btn-view-mode"
                    aria-pressed={viewMode === 'list'}
                    aria-label={t('cabinet.viewList')}
                    onClick={() => setViewMode('list')}
                    type="button"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
                      <rect x="1" y="2" width="3" height="3" rx="0.5" />
                      <rect x="6" y="2" width="9" height="3" rx="0.5" />
                      <rect x="1" y="7" width="3" height="3" rx="0.5" />
                      <rect x="6" y="7" width="9" height="3" rx="0.5" />
                      <rect x="1" y="12" width="3" height="3" rx="0.5" />
                      <rect x="6" y="12" width="9" height="3" rx="0.5" />
                    </svg>
                    <span className="sr-only">{t('cabinet.viewList')}</span>
                  </button>
                </div>

                <div className="tools-menu" ref={toolsRef}>
                  <button
                    className="btn-tools"
                    onClick={() => setToolsOpen(prev => !prev)}
                    aria-expanded={toolsOpen}
                    aria-haspopup="menu"
                  >
                    {t('cabinet.tools')} ▾
                  </button>
                  {toolsOpen && (
                    <div className="tools-dropdown" role="menu">
                      <button
                        className="tools-dropdown-item"
                        role="menuitem"
                        onClick={() => { exportToZip(); setToolsOpen(false); }}
                      >
                        {t('cabinet.exportArchive')}
                      </button>
                      <button
                        className="tools-dropdown-item"
                        role="menuitem"
                        onClick={() => { exportToPdf(language); setToolsOpen(false); }}
                      >
                        {t('cabinet.generateCatalog')}
                      </button>
                      <Link
                        to="/glossary"
                        className="tools-dropdown-item"
                        role="menuitem"
                        onClick={() => setToolsOpen(false)}
                      >
                        {t('glossary.toolbarLink')}
                      </Link>
                    </div>
                  )}
                </div>

                <button className="btn-action btn-primary" onClick={() => navigate('/scriptorium/add')}>
                  {t('cabinet.newEntry')}
                </button>
              </div>
              <p className="type-body cabinet-subtitle">
                {loading
                  ? t('cabinet.loading')
                  : t('cabinet.objectCount', { count: filteredCoins.length })}
              </p>
            </header>

            <SearchBar
              value={filters.searchTerm}
              onChange={(val) => updateFilters({ searchTerm: val })}
              placeholder={t('cabinet.search')}
            />

            {(viewMode === 'list' || selectionCount > 0) && (
              <SelectionToolbar
                count={selectionCount}
                onBulkEdit={() => setBulkEditOpen(true)}
                onBulkDelete={() => setBulkDeleteOpen(true)}
                onExportZip={() => exportSelectionToZip([...selected])}
                onExportPdf={() => exportSelectionToPdf([...selected])}
                onClearSelection={clearAll}
                disabled={selectionCount === 0}
              />
            )}

            {viewMode === 'list' ? (
              <CoinListView
                coins={filteredCoins}
                loading={loading}
                selected={selected}
                onToggleSelect={handleToggleSelect}
                onSelectAll={selectAll}
                onClearAll={clearAll}
              />
            ) : (
              <GalleryGrid
                coins={filteredCoins}
                loading={loading}
                isDatabaseEmpty={coins.length === 0}
                onCoinClick={(id) => navigate(`/coin/${id}`)}
                selectable
                selected={selected}
                onToggleSelect={handleToggleSelect}
              />
            )}
          </section>
        </main>
      </div>

      <FieldVisibilityDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        defaultTab="card"
        anchor="right"
      />

      <ExportToast
        isVisible={status === 'success' || status === 'error'}
        type={status === 'success' ? 'success' : 'error'}
        message={status === 'success'
          ? `Export complete: ${resultPath ? resultPath.split('/').pop() : 'file'}`
          : `Export failed: ${exportError || 'Unknown error'}`
        }
        onDismiss={reset}
      />

      <BulkEditModal
        isOpen={bulkEditOpen}
        onClose={() => setBulkEditOpen(false)}
        selectedIds={[...selected]}
        onComplete={() => {
          refresh();
          clearAll();
          setBulkEditOpen(false);
        }}
      />

      {bulkDeleteOpen && (
        <div className="modal-overlay" onClick={() => setBulkDeleteOpen(false)}>
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-delete-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <h2 id="bulk-delete-modal-title">{t('detail.confirm.title')}</h2>
            <p>{t('cabinet.confirmBulkDelete', { count: selectionCount })}</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-minimal"
                onClick={() => setBulkDeleteOpen(false)}
              >
                {t('detail.confirm.cancel')}
              </button>
              <button
                type="button"
                className="btn-delete"
                onClick={handleBulkDeleteConfirm}
              >
                {t('detail.confirm.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
