import React from 'react';
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';

/**
 * Fallback Component for the Error Boundary
 * Follows the "Manuscript Hybrid" aesthetic (Somber, Technical, Archival).
 */
function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div 
      role="alert" 
      className="error-boundary"
    >
      <div className="error-boundary__container">
        <h1 className="error-boundary__title">
          System Integrity Compromised
        </h1>
        <p className="error-boundary__message">
          The ledger has encountered a critical structural failure. The current operation could not be completed securely.
        </p>
        
        <div className="error-boundary__code">
          ERR_CRITICAL_EXCEPTION: {error instanceof Error ? error.message : 'An unspecified archival error occurred.'}
        </div>

        <button
          onClick={resetErrorBoundary}
          className="error-boundary__button"
        >
          Attempt Recovery
        </button>
      </div>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: unknown, info: { componentStack?: string | null }) => void;
}

export function ErrorBoundary({ children, onError }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={onError}
      onReset={() => {
        // Scoped recovery - reset error boundary state without full page reload
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
