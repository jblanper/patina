import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Cabinet } from './components/Cabinet';
import { CoinDetail } from './components/CoinDetail';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Cabinet />} />
        <Route path="/coin/:id" element={<CoinDetail />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
