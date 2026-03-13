import React from 'react';
import { CoinWithPrimaryImage } from '../../common/types';
import { CoinCard } from './CoinCard';

interface GalleryGridProps {
  coins: CoinWithPrimaryImage[];
  onCoinClick?: (id: number) => void;
  loading?: boolean;
  isDatabaseEmpty?: boolean;
}

/**
 * GalleryGrid Component
 * A responsive CSS Grid for displaying coin pedestals.
 */
export const GalleryGrid: React.FC<GalleryGridProps> = React.memo(({ 
  coins, 
  onCoinClick, 
  loading, 
  isDatabaseEmpty 
}) => {
  if (loading) {
    return (
      <div className="gallery-status">
        <p>Opening the archives...</p>
      </div>
    );
  }

  if (isDatabaseEmpty) {
    return (
      <div className="empty-cabinet">
        <p className="empty-title">The Ledger Awaits</p>
        <p className="empty-desc">Your private archive is currently empty. Begin by recording your first historical object.</p>
        <div className="cabinet-status">Status: Index Ready // Ledger Empty</div>
      </div>
    );
  }

  if (coins.length === 0) {
    return (
      <div className="empty-cabinet">
        <p className="empty-title">The Silent Archive</p>
        <p className="empty-desc">No historical entries match your current search or filter parameters.</p>
        <div className="cabinet-status">Status: Ledger Ready // Filtered Empty</div>
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
          padding: 3rem;
          border: 1px solid var(--border-hairline);
          background: var(--stone-pedestal);
          max-width: 800px;
          margin-top: 2rem;
        }

        .gallery-status p {
          font-family: var(--font-serif);
          font-style: italic;
          font-size: 1.4rem;
          color: var(--text-muted);
        }

        .empty-title {
          font-family: var(--font-serif);
          font-style: italic;
          font-size: 1.8rem;
          color: var(--text-ink);
          margin-bottom: 0.5rem;
        }

        .empty-desc {
          font-family: var(--font-sans);
          font-size: 1rem;
          color: var(--text-muted);
          margin-bottom: 2rem;
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
