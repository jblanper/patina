import React from 'react';
import { CoinWithPrimaryImage } from '../../common/types';
import { CoinCard } from './CoinCard';

interface GalleryGridProps {
  coins: CoinWithPrimaryImage[];
  onCoinClick?: (id: number) => void;
  loading?: boolean;
}

/**
 * GalleryGrid Component
 * A responsive CSS Grid for displaying coin pedestals.
 */
export const GalleryGrid: React.FC<GalleryGridProps> = React.memo(({ coins, onCoinClick, loading }) => {
  if (loading) {
    return (
      <div className="gallery-status">
        <p>Opening the archives...</p>
      </div>
    );
  }

  if (coins.length === 0) {
    return (
      <div className="empty-cabinet">
        <p>The ledger awaits its first historical entry.</p>
        <div className="cabinet-status">Status: Index Ready // Ledger Empty</div>
      </div>
    );
  }

  return (
    <section className="gallery-grid" aria-label="Coin Gallery">
      {coins.map(coin => (
        <CoinCard 
          key={coin.id} 
          coin={coin} 
          onClick={onCoinClick} 
        />
      ))}

      <style jsx>{`
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2rem;
          padding-bottom: 4rem;
        }

        .gallery-status, .empty-cabinet {
          padding: var(--spacing-large);
          border: 1px solid var(--border-hairline);
          background: var(--stone-pedestal);
          max-width: 600px;
        }

        .gallery-status p, .empty-cabinet p {
          font-family: var(--font-serif);
          font-style: italic;
          font-size: 1.4rem;
          color: var(--text-muted);
          margin-bottom: 1rem;
        }

        .cabinet-status {
          font-family: var(--font-mono);
          font-size: 0.6rem;
          color: var(--accent-manuscript);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
      `}</style>
    </section>
  );
});

GalleryGrid.displayName = 'GalleryGrid';
