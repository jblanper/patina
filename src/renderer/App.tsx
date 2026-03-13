import React from 'react';
import { useCoins } from './hooks/useCoins';
import { GalleryGrid } from './components/GalleryGrid';
import { PatinaSidebar } from './components/PatinaSidebar';
import { SearchBar } from './components/SearchBar';

const App: React.FC = () => {
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
    <div className="app-container">
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
              <h2 className="cabinet-title">The Cabinet</h2>
              <p className="type-body cabinet-subtitle">
                {loading 
                  ? 'Synchronizing with the local archive...' 
                  : `The collection contains ${filteredCoins.length} verified historical objects.`}
              </p>
            </header>

            <SearchBar 
              value={filters.searchTerm}
              onChange={(val) => updateFilters({ searchTerm: val })}
            />

            <GalleryGrid 
              coins={filteredCoins} 
              loading={loading} 
              isDatabaseEmpty={coins.length === 0}
              onCoinClick={(id) => console.log('Coin clicked:', id)} 
            />
          </section>
        </main>
      </div>
    </div>
  );
};

export default App;
