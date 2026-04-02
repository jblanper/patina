import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCoin } from '../hooks/useCoin';
import { FieldVisibilityDrawer } from './FieldVisibilityDrawer';
import { useFieldVisibility } from '../hooks/useFieldVisibility';

export const CoinDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { coin, images, isLoading, error } = useCoin(id);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isVisible } = useFieldVisibility();

  const handleDelete = async () => {
    if (!id) return;
    try {
      await window.electronAPI.deleteCoin(parseInt(id, 10));
      navigate('/');
    } catch (err) {
      console.error('Failed to delete coin:', err);
    }
  };

  // Determine which image to show as main
  const mainImage = selectedImageId
    ? images.find(img => img.id === selectedImageId)
    : images.find(img => img.is_primary) || images[0];

  const handleBack = () => {
    navigate(-1);
  };

  const getImageUrl = (path: string) => `patina-img://${path}`;

  if (isLoading) {
    return (
      <div className="coin-detail-loading">
        <p className="type-body">{t('detail.loading')}</p>
      </div>
    );
  }

  if (error || !coin) {
    return (
      <div className="coin-detail-error">
        <p className="type-body">{t('detail.notFound')}</p>
        <button onClick={handleBack} className="btn-minimal">{t('detail.returnToCabinet')}</button>
      </div>
    );
  }

  return (
    <>
      <header className="app-header">
        <button onClick={handleBack} className="nav-back" aria-label={t('detail.closeEntry')}>
          {t('detail.closeEntry')}
        </button>
        <div className="header-actions">
          <button
            className="btn-customize"
            onClick={() => setDrawerOpen(true)}
            aria-label={t('detail.customizeDisplay')}
          >
            {t('detail.customizeDisplay')}
          </button>
          <button onClick={() => navigate(`/scriptorium/edit/${coin.id}`)} className="btn-minimal">
            {t('detail.editRecord')}
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="btn-delete">
            {t('detail.deleteRecord')}
          </button>
        </div>
      </header>

      <FieldVisibilityDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        defaultTab="ledger"
        anchor="left"
      />

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{t('detail.confirm.title')}</h2>
            <p>{t('detail.confirm.message')}</p>
            <div className="modal-actions">
              <button className="btn-minimal" onClick={() => setShowDeleteConfirm(false)}>{t('detail.confirm.cancel')}</button>
              <button className="btn-delete" onClick={handleDelete}>{t('detail.confirm.delete')}</button>
            </div>
          </div>
        </div>
      )}

      <div className="ledger-layout">
        {/* Left Folio: The Plate */}
        <div className="left-folio">
          <div className="plate-frame" onClick={() => setIsZoomOpen(true)}>
            {mainImage ? (
              <img
                src={getImageUrl(mainImage.path)}
                alt={mainImage.label || coin.title}
                className="main-image"
              />
            ) : (
              <div className="no-image-placeholder">{t('detail.noImage')}</div>
            )}
          </div>
          <div className="plate-caption">
            {(mainImage?.label || t('ledger.obverse')).toUpperCase()} // 2:1 SCALE
          </div>

          {images.length > 1 && (
            <div className="thumbnail-strip">
              {images.map((img) => (
                <button
                  key={img.id}
                  className={`thumbnail-btn ${mainImage?.id === img.id ? 'active' : ''}`}
                  onClick={() => setSelectedImageId(img.id)}
                >
                  <img
                    src={getImageUrl(img.path)}
                    alt={img.label || 'Coin view'}
                    className="thumbnail-img"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Folio: The Record */}
        <div className="right-folio">
           <header className="folio-header">
             <span className="meta-line">
               {t('detail.entryLabel')} #{String(coin.id).padStart(3, '0')}
               {isVisible('ledger.era') && ` // ${coin.era}`}
               {isVisible('ledger.issuer') && ` // ${coin.issuer || t('detail.unknownIssuer')}`}
             </span>
             <h1 className="folio-title">{coin.title}</h1>
             <div className="subtitle">
               {isVisible('ledger.mint') && (coin.mint ? `${t('detail.mintedAt')} ${coin.mint}` : t('detail.mintUnknown'))}
               {isVisible('ledger.denomination') && coin.denomination && ` // ${coin.denomination}`}
             </div>
             {((isVisible('ledger.year') && coin.year_display) || (isVisible('ledger.catalog_ref') && coin.catalog_ref)) && (
               <div className="subtitle-ref">
                 {isVisible('ledger.year') && coin.year_display && (
                   <>
                     {coin.year_display}
                     {coin.year_numeric != null && ` · ${coin.year_numeric} CE`}
                   </>
                 )}
                 {isVisible('ledger.catalog_ref') && coin.catalog_ref && (
                   <>
                     {(isVisible('ledger.year') && coin.year_display) ? ' // ' : ''}
                     {coin.catalog_ref}
                   </>
                 )}
               </div>
             )}
           </header>

          {/* 1. Physical Metrics */}
          <div className="metrics-grid">
            {/* weight: locked — always rendered */}
            <div className="metric-item">
              <span className="metric-label">{t('ledger.weight')}</span>
              <span className="metric-value">
                {coin.weight ? `${coin.weight.toFixed(2)} g` : '—'}
              </span>
            </div>
            {/* diameter: locked — always rendered */}
            <div className="metric-item">
              <span className="metric-label">{t('ledger.diameter')}</span>
              <span className="metric-value">
                {coin.diameter ? `${coin.diameter.toFixed(1)} mm` : '—'}
              </span>
            </div>
            {isVisible('ledger.die_axis') && (
              <div className="metric-item">
                <span className="metric-label">{t('ledger.dieAxis')}</span>
                <span className="metric-value">{coin.die_axis || '—'}</span>
              </div>
            )}
            {isVisible('ledger.metal') && (
              <div className="metric-item">
                <span className="metric-label">{t('ledger.material')}</span>
                <span className="metric-value">{coin.metal || '—'}</span>
              </div>
            )}
            {isVisible('ledger.fineness') && (
              <div className="metric-item">
                <span className="metric-label">{t('ledger.fineness')}</span>
                <span className="metric-value">{coin.fineness || '—'}</span>
              </div>
            )}
            {isVisible('ledger.grade') && (
              <div className="metric-item">
                <span className="metric-label">{t('ledger.grade')}</span>
                <span className="metric-value">{coin.grade || '—'}</span>
              </div>
            )}
            {isVisible('ledger.rarity') && (
              <div className="metric-item">
                <span className="metric-label">{t('ledger.rarity')}</span>
                <span className="metric-value">{coin.rarity || '—'}</span>
              </div>
            )}
          </div>

          {/* 2. Numismatic Data */}
          <div className="numismatic-section">
            {(isVisible('ledger.obverse_legend') || isVisible('ledger.obverse_desc')) && (coin.obverse_legend || coin.obverse_desc) ? (
              <>
                <span className="section-label">{t('ledger.obverse')}</span>
                <div className="desc-block">
                  {isVisible('ledger.obverse_legend') && coin.obverse_legend && (
                    <span className="desc-legend">{coin.obverse_legend}</span>
                  )}
                  {isVisible('ledger.obverse_desc') && coin.obverse_desc && (
                    <p className="desc-text">{coin.obverse_desc}</p>
                  )}
                </div>
              </>
            ) : null}

            {(isVisible('ledger.reverse_legend') || isVisible('ledger.reverse_desc')) && (coin.reverse_legend || coin.reverse_desc) ? (
              <>
                <span className="section-label">{t('ledger.reverse')}</span>
                <div className="desc-block">
                  {isVisible('ledger.reverse_legend') && coin.reverse_legend && (
                    <span className="desc-legend">{coin.reverse_legend}</span>
                  )}
                  {isVisible('ledger.reverse_desc') && coin.reverse_desc && (
                    <p className="desc-text">{coin.reverse_desc}</p>
                  )}
                </div>
              </>
            ) : null}

            {isVisible('ledger.edge_desc') && coin.edge_desc && (
              <>
                <span className="section-label">{t('ledger.edge')}</span>
                <div className="desc-block">
                  <p className="desc-text">{coin.edge_desc}</p>
                </div>
              </>
            )}
          </div>

          {/* 3. Curator's Note */}
          {isVisible('ledger.story') && coin.story && (
            <div className="numismatic-section">
              <span className="section-label">{t('ledger.curatorsNote')}</span>
              <div className="desc-block">
                {coin.story.split('\n').map((para, i) => (
                  <p key={i} className="desc-text curator-note">"{para}"</p>
                ))}
              </div>
            </div>
          )}

          {/* Provenance — separate section */}
          {isVisible('ledger.provenance') && coin.provenance && (
            <div className="numismatic-section">
              <span className="section-label">{t('ledger.provenance')}</span>
              <div className="provenance-note">{coin.provenance}</div>
            </div>
          )}

          {/* 4. Acquisition Footer */}
          {isVisible('ledger.acquisition') && (
            <footer className="ledger-footer">
              <div className="footer-item">
                <strong>{t('detail.acquired')}:</strong>
                {coin.purchase_date || t('detail.unknownDate')}
                {coin.purchase_source && ` // ${coin.purchase_source}`}
              </div>
              {coin.purchase_price && (
                <div className="footer-item cost-item">
                  <strong>{t('detail.cost')}:</strong>
                  ${coin.purchase_price.toFixed(2)}
                </div>
              )}
            </footer>
          )}
        </div>
      </div>

      {/* Image Zoom Modal */}
      {isZoomOpen && mainImage && (
        <div className="zoom-modal" role="dialog" aria-modal="true" onClick={() => setIsZoomOpen(false)}>
          <div className="zoom-content" onClick={e => e.stopPropagation()}>
            <button className="zoom-close" onClick={() => setIsZoomOpen(false)} aria-label="Close image zoom">×</button>
            <img
              src={getImageUrl(mainImage.path)}
              alt={mainImage.label || coin.title}
              className="zoom-image"
            />
          </div>
        </div>
      )}
    </>
  );
};
