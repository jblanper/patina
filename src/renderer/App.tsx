import React, { useEffect, useState } from 'react';
import { Coin } from '../common/types';

const App: React.FC = () => {
  const [ipcStatus, setIpcStatus] = useState<string>('Pinging...');
  const [coins, setCoins] = useState<Coin[]>([]);

  useEffect(() => {
    window.electronAPI.ping().then((res) => {
      setIpcStatus(`Main process responded with: ${res}`);
    });

    // Test DB: Add a sample coin if none exist
    window.electronAPI.getCoins().then(async (existingCoins) => {
      if (existingCoins.length === 0) {
        console.log('No coins found, adding a sample...');
        await window.electronAPI.addCoin({
          title: 'Athens Owl Tetradrachm',
          issuer: 'Athens',
          denomination: 'Tetradrachm',
          year_display: 'c. 440-404 BC',
          year_numeric: -440,
          era: 'Ancient',
          metal: 'Silver',
          story: 'The most iconic coin of the ancient world.'
        });
        const updatedCoins = await window.electronAPI.getCoins();
        setCoins(updatedCoins);
      } else {
        setCoins(existingCoins);
      }
    });
  }, []);

  return (
    <div className="app-container">
      <header>
        <h1>Patina</h1>
        <p>Historical Coin Archive</p>
      </header>
      <main>
        <div className="welcome-screen">
          <h2>Welcome, Curator</h2>
          <p>Your collection has {coins.length} item(s).</p>
          
          <div style={{ marginTop: '20px', textAlign: 'left' }}>
            {coins.map(coin => (
              <div key={coin.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                <strong>{coin.title}</strong> ({coin.year_display})
              </div>
            ))}
          </div>

          <div className="status-badge" style={{ marginTop: '40px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            System Status: {ipcStatus}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
