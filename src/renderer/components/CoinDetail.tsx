import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCoin } from '../hooks/useCoin';

export const CoinDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { coin, images, isLoading, error } = useCoin(id);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        <p className="type-body">Retrieving archival record...</p>
      </div>
    );
  }

  if (error || !coin) {
    return (
      <div className="coin-detail-error">
        <p className="type-body">Record not found.</p>
        <button onClick={handleBack} className="btn-minimal">Return to Cabinet</button>
      </div>
    );
  }

  return (
    <>
      <header className="app-header">
        <button onClick={handleBack} className="nav-back" aria-label="Close Ledger Entry">
          ← Close Ledger Entry
        </button>
        <div className="header-actions">
          <button onClick={() => navigate(`/scriptorium/edit/${coin.id}`)} className="btn-minimal">
            Edit Record
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="btn-delete">
            Delete Record
          </button>
        </div>
      </header>

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Confirm Deletion</h2>
            <p>Are you certain you wish to remove this record from the archive? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn-minimal" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleDelete}>Delete</button>
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
              <div className="no-image-placeholder">No Image Available</div>
            )}
          </div>
          <div className="plate-caption">
            {(mainImage?.label || 'OBVERSE').toUpperCase()} // 2:1 SCALE
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
               Entry #{String(coin.id).padStart(3, '0')} // {coin.era} // {coin.issuer || 'Unknown Issuer'}
             </span>
             <h1 className="folio-title">{coin.title}</h1>
             <div className="subtitle">
               {coin.mint ? `Minted at ${coin.mint}` : 'Mint Unknown'} 
               {coin.year_display && ` // ${coin.year_display}`}
               {coin.catalog_ref && ` // ${coin.catalog_ref}`}
             </div>
           </header>

          {/* 1. Physical Metrics */}
          <div className="metrics-grid">
            <div className="metric-item">
              <span className="metric-label">Weight</span>
              <span className="metric-value">
                {coin.weight ? `${coin.weight.toFixed(2)} g` : '—'}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Diameter</span>
              <span className="metric-value">
                {coin.diameter ? `${coin.diameter.toFixed(1)} mm` : '—'}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Die Axis</span>
              <span className="metric-value">{coin.die_axis || '—'}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Material</span>
              <span className="metric-value">{coin.metal || '—'}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Fineness</span>
              <span className="metric-value">{coin.fineness || '—'}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Grade</span>
              <span className="metric-value">{coin.grade || '—'}</span>
            </div>
          </div>

          {/* 2. Numismatic Data */}
          <div className="numismatic-section">
            {(coin.obverse_legend || coin.obverse_desc) && (
              <>
                <span className="section-label">Obverse</span>
                <div className="desc-block">
                  {coin.obverse_legend && <span className="desc-legend">{coin.obverse_legend}</span>}
                  {coin.obverse_desc && <p className="desc-text">{coin.obverse_desc}</p>}
                </div>
              </>
            )}

            {(coin.reverse_legend || coin.reverse_desc) && (
              <>
                <span className="section-label">Reverse</span>
                <div className="desc-block">
                  {coin.reverse_legend && <span className="desc-legend">{coin.reverse_legend}</span>}
                  {coin.reverse_desc && <p className="desc-text">{coin.reverse_desc}</p>}
                </div>
              </>
            )}
            
            {coin.edge_desc && (
               <>
                <span className="section-label">Edge</span>
                <div className="desc-block">
                  <p className="desc-text">{coin.edge_desc}</p>
                </div>
               </>
            )}
          </div>

          {/* 3. Curator's Note */}
          {coin.story && (
            <div className="numismatic-section">
              <span className="section-label">Curator's Note</span>
              <div className="desc-block">
                {coin.story.split('\n').map((para, i) => (
                  <p key={i} className="desc-text curator-note">"{para}"</p>
                ))}
              </div>
            </div>
          )}

          {/* Provenance — separate section */}
          {coin.provenance && (
            <div className="numismatic-section">
              <span className="section-label">Provenance</span>
              <div className="provenance-note">{coin.provenance}</div>
            </div>
          )}

          {/* 4. Acquisition Footer */}
          <footer className="ledger-footer">
            <div className="footer-item">
              <strong>Acquired:</strong> 
              {coin.purchase_date || 'Unknown Date'} 
              {coin.purchase_source && ` // ${coin.purchase_source}`}
            </div>
            {coin.purchase_price && (
               <div className="footer-item cost-item">
                 <strong>Cost:</strong> 
                 ${coin.purchase_price.toFixed(2)}
               </div>
            )}
          </footer>
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
