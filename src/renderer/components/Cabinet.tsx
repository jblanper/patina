import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FieldVisibilityDrawer } from './FieldVisibilityDrawer';
import { useCoins } from '../hooks/useCoins';
import { useExport } from '../hooks/useExport';
import { useLanguage } from '../hooks/useLanguage';
import { GalleryGrid } from './GalleryGrid';
import { PatinaSidebar } from './PatinaSidebar';
import { SearchBar } from './SearchBar';
import { ExportToast } from './ExportToast';

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
    availableGrades
  } = useCoins();

  const { language } = useLanguage();
  const { status, resultPath, error: exportError, exportToZip, exportToPdf, reset } = useExport();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

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

  if (error) {
    throw error;
  }

  return (
    <>
      <header className="app-header">
        <h1>{t('cabinet.header')}</h1>
        <div className="version-tag">{t('cabinet.tagline')}</div>
      </header>

      <div className="app-layout">
        <PatinaSidebar
          filters={filters}
          updateFilters={updateFilters}
          clearFilters={clearFilters}
          availableMetals={availableMetals}
          availableGrades={availableGrades}
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

            <GalleryGrid
              coins={filteredCoins}
              loading={loading}
              isDatabaseEmpty={coins.length === 0}
              onCoinClick={(id) => navigate(`/coin/${id}`)}
            />
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
    </>
  );
};
