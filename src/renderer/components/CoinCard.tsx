import React from 'react';
import { useTranslation } from 'react-i18next';
import { CoinWithPrimaryImage } from '../../common/types';
import { useFieldVisibility } from '../hooks/useFieldVisibility';

interface CoinCardProps {
  coin: CoinWithPrimaryImage;
  onClick?: (id: number) => void;
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: number, shiftKey: boolean) => void;
}

/**
 * Path 1: The Archival Pedestal
 * Merges the borderless archival look with persistent data.
 * Adheres to 2-decimal (weight) and 1-decimal (diameter) rules.
 */
export const CoinCard: React.FC<CoinCardProps> = React.memo(({ coin, onClick, selectable, isSelected, onToggleSelect }) => {
  const { t } = useTranslation();
  const { isVisible } = useFieldVisibility();

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

  const imageSrc = coin.primary_image_path
    ? `patina-img://${coin.primary_image_path}`
    : null;

  const cardClassName = `coin-card${isSelected ? ' coin-card--selected' : ''}`;

  return (
    <article
      className={cardClassName}
      onClick={() => onClick?.(coin.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(coin.id);
        }
      }}
      tabIndex={0}
      aria-label={`Coin card for ${coin.title}`}
    >
      {selectable && (
        <label
          className="card-checkbox-wrapper"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={!!isSelected}
            aria-label={t('cabinet.selectCoin', { title: coin.title })}
            onChange={(e) => {
              onToggleSelect?.(coin.id, (e.nativeEvent as MouseEvent).shiftKey);
            }}
          />
        </label>
      )}

      <div className="coin-image-container">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={coin.title}
            className="coin-image"
            loading="lazy"
          />
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

        {isVisible('card.grade') && coin.grade && (
          <div className="coin-grade-row">
            <span className="coin-grade-label">{t('ledger.grade')}</span>
            <span className="coin-grade-value">{coin.grade}</span>
          </div>
        )}

        {coin.catalog_ref && (
          <div className="coin-ref">
            REF. {coin.catalog_ref}
          </div>
        )}
      </div>
    </article>
  );
});

CoinCard.displayName = 'CoinCard';
