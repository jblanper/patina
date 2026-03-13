import React from 'react';
import { useCoins } from './hooks/useCoins';
import { GalleryGrid } from './components/GalleryGrid';

const App: React.FC = () => {
  const { 
    filteredCoins, 
    loading, 
    error, 
    filters, 
    updateFilters,
    availableMetals 
  } = useCoins();

  if (error) {
    throw error;
  }

  return (
    <div className="app-container">
      <header>
        <h1>Patina</h1>
        <div className="version-tag">Archive v1.0 // THE DISPLAY CASE</div>
      </header>

      <main>
        <section className="welcome-screen">
          <h2 style={{ fontSize: '3rem', marginBottom: '1rem', letterSpacing: '-2px' }}>
            The Cabinet
          </h2>
          <p className="type-body" style={{ marginBottom: '2.5rem' }}>
            {loading 
              ? 'Synchronizing with the local archive...' 
              : `The collection contains ${filteredCoins.length} verified historical objects.`}
          </p>

          <div style={{ marginBottom: '2rem' }}>
            <label className="type-meta" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Search the Ledger
            </label>
            <input 
              type="text" 
              className="input-minimal"
              placeholder="Title, issuer, or catalog reference..."
              value={filters.searchTerm}
              onChange={(e) => updateFilters({ searchTerm: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '2rem', marginBottom: '3rem' }}>
             <div>
                <label className="type-meta" style={{ display: 'block', marginBottom: '0.5rem' }}>Era</label>
                <select 
                  className="input-minimal" 
                  multiple 
                  style={{ height: '80px', minWidth: '150px' }}
                  value={filters.era}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value as any);
                    updateFilters({ era: values });
                  }}
                >
                  <option value="Ancient">Ancient</option>
                  <option value="Medieval">Medieval</option>
                  <option value="Modern">Modern</option>
                </select>
             </div>

             <div>
                <label className="type-meta" style={{ display: 'block', marginBottom: '0.5rem' }}>Metal</label>
                <select 
                  className="input-minimal" 
                  multiple 
                  style={{ height: '80px', minWidth: '150px' }}
                  value={filters.metal}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    updateFilters({ metal: values });
                  }}
                >
                  {availableMetals.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
             </div>
          </div>

          <GalleryGrid 
            coins={filteredCoins} 
            loading={loading} 
            onCoinClick={(id) => console.log('Coin clicked:', id)} 
          />
        </section>
      </main>
    </div>
  );
};

export default App;
