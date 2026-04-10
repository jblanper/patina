import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary
      onError={(error) => {
        const err = error instanceof Error ? error : new Error(String(error));
        window.electronAPI.logError({
          message: err.message,
          stack: err.stack?.split('\n').slice(0, 4).join('\n'),
        });
      }}
    >
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
