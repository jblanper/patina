import React, { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Cabinet } from './components/Cabinet';
import { CoinDetail } from './components/CoinDetail';
import { Scriptorium } from './components/Scriptorium';
import './i18n';
import i18n from './i18n';

const App: React.FC = () => {
  useEffect(() => {
    window.electronAPI.getPreference('language').then((saved) => {
      if (saved === 'en' || saved === 'es') {
        i18n.changeLanguage(saved);
      }
    }).catch(() => {
      // No saved preference — keep default ('es')
    });
  }, []);

  return (
    <HashRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Cabinet />} />
          <Route path="/coin/:id" element={<CoinDetail />} />
          <Route path="/scriptorium/add" element={<Scriptorium />} />
          <Route path="/scriptorium/edit/:id" element={<Scriptorium />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;
