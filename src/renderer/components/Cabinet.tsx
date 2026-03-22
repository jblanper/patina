import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
                <button className="btn-action" onClick={() => exportToZip()}>
                  {t('cabinet.exportArchive')}
                </button>
                <button className="btn-action" onClick={() => exportToPdf(language)}>
                  {t('cabinet.generateCatalog')}
                </button>
                <Link to="/glossary" className="btn-action glossary-toolbar-link">
                  {t('glossary.toolbarLink')}
                </Link>
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
