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
      style={{
        padding: 'clamp(2rem, 5vw, 3rem)',
        backgroundColor: '#FCF9F2',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        fontFamily: "'Montserrat', sans-serif"
      }}
    >
      <div style={{
        borderLeft: '4px solid #B22222',
        paddingLeft: '2rem',
        maxWidth: '800px'
      }}>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '2.5rem',
          color: '#2D2926',
          marginBottom: '1rem',
          fontWeight: 700
        }}>
          System Integrity Compromised
        </h1>
        <p style={{
          fontSize: '1rem',
          color: '#7A7875',
          marginBottom: '2rem',
          lineHeight: 1.6
        }}>
          The ledger has encountered a critical structural failure. The current operation could not be completed securely.
        </p>
        
        <div style={{
          backgroundColor: '#F0EDE6',
          padding: '1.5rem',
          marginBottom: '2rem',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.85rem',
          color: '#B22222',
          border: '1px solid #E0DCCD'
        }}>
          ERR_CRITICAL_EXCEPTION: {error.message}
        </div>

        <button
          onClick={resetErrorBoundary}
          style={{
            backgroundColor: '#2D2926',
            color: '#FFFFFF',
            padding: '1rem 2.5rem',
            border: 'none',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.75rem',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#914E32')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2D2926')}
        >
          Attempt Recovery
        </button>
      </div>
    </div>
  );
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset the state of your app so the error doesn't happen again
        window.location.reload();
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
