import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCoins } from '../hooks/useCoins';
import { GalleryGrid } from './GalleryGrid';
import { PatinaSidebar } from './PatinaSidebar';
import { SearchBar } from './SearchBar';

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

  if (error) {
    throw error;
  }

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
            <header className="cabinet-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h2 className="cabinet-title">The Cabinet</h2>
                <p className="type-body cabinet-subtitle">
                  {loading 
                    ? 'Synchronizing with the local archive...' 
                    : `The collection contains ${filteredCoins.length} verified historical objects.`}
                </p>
              </div>
              <button className="btn-solid" onClick={() => navigate('/scriptorium/add')}>
                + New Entry
              </button>
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
    </>
  );
};
