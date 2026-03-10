import React, { useEffect, useState } from 'react';

const App: React.FC = () => {
  const [ipcStatus, setIpcStatus] = useState<string>('Pinging...');

  useEffect(() => {
    window.electronAPI.ping().then((res) => {
      setIpcStatus(`Main process responded with: ${res}`);
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
          <p>Your collection is waiting.</p>
          <div className="status-badge" style={{ marginTop: '20px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            System Status: {ipcStatus}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
