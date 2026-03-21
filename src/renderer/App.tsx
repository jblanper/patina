import React, { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Cabinet } from './components/Cabinet';
import { CoinDetail } from './components/CoinDetail';
import { Scriptorium } from './components/Scriptorium';
import { Glossary } from './components/Glossary';
import { GlossaryDrawer } from './components/GlossaryDrawer';
import { GlossaryContext } from './contexts/GlossaryContext';
import { useGlossaryDrawer } from './hooks/useGlossaryDrawer';
import './i18n';
import i18n from './i18n';

const App: React.FC = () => {
  const glossaryDrawer = useGlossaryDrawer();

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
        <GlossaryContext.Provider value={glossaryDrawer}>
          <Routes>
            <Route path="/" element={<Cabinet />} />
            <Route path="/coin/:id" element={<CoinDetail />} />
            <Route path="/scriptorium/add" element={<Scriptorium />} />
            <Route path="/scriptorium/edit/:id" element={<Scriptorium />} />
            <Route path="/glossary" element={<Glossary />} />
          </Routes>
          <GlossaryDrawer
            open={glossaryDrawer.drawerState.open}
            field={glossaryDrawer.drawerState.field}
            onClose={glossaryDrawer.close}
            onOpenField={glossaryDrawer.openField}
            onOpenIndex={glossaryDrawer.openIndex}
          />
        </GlossaryContext.Provider>
      </div>
    </HashRouter>
  );
};

export default App;
