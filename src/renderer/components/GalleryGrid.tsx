import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="gallery-status">
        <p>{t('gallery.loading')}</p>
      </div>
    );
  }

  if (isDatabaseEmpty) {
    return (
      <div className="empty-cabinet">
        <p className="empty-title">{t('gallery.emptyTitle')}</p>
        <p className="empty-desc">{t('gallery.emptyDesc')}</p>
        <div className="cabinet-status">{t('gallery.emptyStatus')}</div>
      </div>
    );
  }

  if (coins.length === 0) {
    return (
      <div className="empty-cabinet">
        <p className="empty-title">{t('gallery.filteredTitle')}</p>
        <p className="empty-desc">{t('gallery.filteredDesc')}</p>
        <div className="cabinet-status">{t('gallery.filteredStatus')}</div>
      </div>
    );
  }

  return (
    <section className="gallery-grid" aria-label={t('gallery.ariaLabel')}>
      {coins.map(coin => (
        <CoinCard
          key={coin.id}
          coin={coin}
          onClick={onCoinClick}
        />
      ))}
    </section>
  );
});

GalleryGrid.displayName = 'GalleryGrid';
