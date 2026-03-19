import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCoins } from '../hooks/useCoins';
import { useExport } from '../hooks/useExport';
import { GalleryGrid } from './GalleryGrid';
import { PatinaSidebar } from './PatinaSidebar';
import { SearchBar } from './SearchBar';
import { ExportToast } from './ExportToast';

export const Cabinet: React.FC = () => {
  const navigate = useNavigate();
  const { 
    coins,
    filteredCoins, 
    loading, 
    error, 
    filters, 
    updateFilters,
    clearFilters,
    availableMetals 
  } = useCoins();

  const { status, resultPath, error: exportError, exportToZip, exportToPdf, reset } = useExport();

  if (error) {
    throw error;
  }

  const handleExportZip = () => {
    exportToZip();
  };

  const handleExportPdf = () => {
    exportToPdf();
  };

  return (
    <>
      <header className="app-header">
        <h1>Patina</h1>
        <div className="version-tag">Archive v1.0 // THE DISPLAY CASE</div>
      </header>

      <div className="app-layout">
        <PatinaSidebar 
          filters={filters}
          updateFilters={updateFilters}
          clearFilters={clearFilters}
          availableMetals={availableMetals}
        />

        <main className="app-main">
          <section className="cabinet-section">
            <header className="cabinet-header">
              <div>
                <h2 className="cabinet-title">The Cabinet</h2>
                <p className="type-body cabinet-subtitle">
                  {loading 
                    ? 'Synchronizing with the local archive...' 
                    : `The collection contains ${filteredCoins.length} verified historical objects.`}
                </p>
              </div>
              <div className="cabinet-toolbar">
                <button className="btn-action" onClick={handleExportZip}>
                  Export Archive
                </button>
                <button className="btn-action" onClick={handleExportPdf}>
                  Generate Catalog
                </button>
                <button className="btn-action btn-primary" onClick={() => navigate('/scriptorium/add')}>
                  + New Entry
                </button>
              </div>
            </header>

            <SearchBar 
              value={filters.searchTerm}
              onChange={(val) => updateFilters({ searchTerm: val })}
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
