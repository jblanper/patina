import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Cabinet } from './components/Cabinet';
import { CoinDetail } from './components/CoinDetail';
import { Scriptorium } from './components/Scriptorium';

const App: React.FC = () => {
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
