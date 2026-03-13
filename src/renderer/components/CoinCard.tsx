import React from 'react';
import { CoinWithPrimaryImage } from '../../common/types';

interface CoinCardProps {
  coin: CoinWithPrimaryImage;
  onClick?: (id: number) => void;
}

/**
 * Path 1: The Archival Pedestal
 * Merges the borderless archival look with persistent data.
 * Adheres to 2-decimal (weight) and 1-decimal (diameter) rules.
 */
export const CoinCard: React.FC<CoinCardProps> = React.memo(({ coin, onClick }) => {
  const formatWeight = (w?: number) => {
    if (w === undefined || w === null) return '—.——g';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(w) + 'g';
  };

  const formatDiameter = (d?: number) => {
    if (d === undefined || d === null) return '—.—mm';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(d) + 'mm';
  };

  // Safe image path handling (using relative paths from data/images)
  // In a real Electron app, you might use a custom protocol like patina://
  // For now, we'll assume the renderer can resolve them if the base path is handled.
  const imageSrc = coin.primary_image_path 
    ? `patina-img://${coin.primary_image_path}` 
    : null;

  return (
    <article 
      className="coin-card"
      onClick={() => onClick?.(coin.id)}
      tabIndex={0}
      aria-label={`Coin card for ${coin.title}`}
    >
      <div className="coin-image-container">
        {imageSrc ? (
          <img src={imageSrc} alt={coin.title} className="coin-image" />
        ) : (
          <div className="coin-placeholder">
            <div className="coin-silhouette" />
          </div>
        )}
      </div>
      
      <div className="coin-info">
        <h3 className="coin-title">{coin.title}</h3>
        
        <div className="coin-metrics">
          <span className="metric-metal">{coin.metal || '??'}</span>
          <span className="metric-divider">//</span>
          <span className="metric-weight">{formatWeight(coin.weight)}</span>
          <span className="metric-divider">//</span>
          <span className="metric-diameter">{formatDiameter(coin.diameter)}</span>
        </div>
        
        {coin.catalog_ref && (
          <div className="coin-ref">
            REF. {coin.catalog_ref}
          </div>
        )}
      </div>

      <style jsx>{`
        .coin-card {
          padding: 1rem;
          cursor: pointer;
          transition: background 0.2s ease;
          position: relative;
          background: transparent;
          display: flex;
          flex-direction: column;
          outline: none;
        }

        /* Subtle Internal Border on Hover (No Layout Shift) */
        .coin-card::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          border: 1px solid transparent;
          pointer-events: none;
          transition: border-color 0.3s ease;
        }

        .coin-card:hover, .coin-card:focus-visible {
          background: #F4F1E9; /* Slight shift from --bg-manuscript */
        }

        .coin-card:hover::after, .coin-card:focus-visible::after {
          border-color: var(--accent-manuscript);
        }

        .coin-image-container {
          width: 100%;
          aspect-ratio: 1;
          background-color: var(--stone-pedestal);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          margin-bottom: 1.5rem;
          overflow: hidden;
        }

        .coin-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .coin-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .coin-silhouette {
          width: 70%;
          height: 70%;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #E8E4D8 0%, #D1CDC0 100%);
          box-shadow: 4px 4px 15px rgba(0,0,0,0.05);
        }

        .coin-info {
          display: flex;
          flex-direction: column;
        }

        .coin-title {
          font-family: var(--font-serif);
          font-weight: 700;
          font-size: 1.3rem;
          margin-bottom: 0.5rem;
          color: var(--text-ink);
          line-height: 1.2;
        }

        .coin-metrics {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--accent-manuscript);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .metric-divider {
          color: var(--border-hairline);
          font-weight: 400;
        }

        .coin-ref {
          font-family: var(--font-sans);
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.4rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }
      `}</style>
    </article>
  );
});

CoinCard.displayName = 'CoinCard';
