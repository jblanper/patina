import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCoin } from '../hooks/useCoin';
import { CoinImage } from '../../common/types';

export const CoinDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { coin, images, isLoading, error } = useCoin(id);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

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
    <div className="coin-detail-container">
      {/* Header */}
      <header className="detail-header">
        <button onClick={handleBack} className="back-btn" aria-label="Go back">
          ← Cabinet
        </button>
        <div className="detail-title-group">
          <h1 className="detail-title">{coin.title}</h1>
          <div className="detail-subtitle">
            <span className="detail-issuer">{coin.issuer}</span>
            {coin.year_display && <span className="detail-year"> // {coin.year_display}</span>}
          </div>
        </div>
      </header>

      <div className="detail-content">
        {/* Left Column: The Plate */}
        <div className="detail-plate">
          <div className="main-image-frame" onClick={() => setIsZoomOpen(true)}>
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

        {/* Right Column: The Record */}
        <div className="detail-record">
          <section className="record-section">
            <h3 className="record-heading">Physical Data</h3>
            <div className="record-grid">
              <div className="record-item">
                <span className="record-label">Weight</span>
                <span className="record-value mono">
                  {coin.weight ? `${coin.weight.toFixed(2)} g` : '—'}
                </span>
              </div>
              <div className="record-item">
                <span className="record-label">Diameter</span>
                <span className="record-value mono">
                  {coin.diameter ? `${coin.diameter.toFixed(1)} mm` : '—'}
                </span>
              </div>
              <div className="record-item">
                <span className="record-label">Material</span>
                <span className="record-value">{coin.metal || '—'}</span>
              </div>
              <div className="record-item">
                <span className="record-label">Fineness</span>
                <span className="record-value">{coin.fineness || '—'}</span>
              </div>
              <div className="record-item">
                <span className="record-label">Axis</span>
                <span className="record-value">{coin.die_axis || '—'}</span>
              </div>
            </div>
          </section>

          <section className="record-section">
            <h3 className="record-heading">Attribution</h3>
            <div className="record-grid">
              <div className="record-item">
                <span className="record-label">Mint</span>
                <span className="record-value">{coin.mint || '—'}</span>
              </div>
              <div className="record-item">
                <span className="record-label">Era</span>
                <span className="record-value">{coin.era}</span>
              </div>
              <div className="record-item">
                <span className="record-label">Grade</span>
                <span className="record-value">{coin.grade || '—'}</span>
              </div>
              <div className="record-item">
                <span className="record-label">Reference</span>
                <span className="record-value mono">{coin.catalog_ref || '—'}</span>
              </div>
              <div className="record-item">
                <span className="record-label">Rarity</span>
                <span className="record-value">{coin.rarity || '—'}</span>
              </div>
            </div>
          </section>

          {(coin.obverse_legend || coin.obverse_desc) && (
            <section className="record-section">
              <h3 className="record-heading">Obverse</h3>
              {coin.obverse_legend && <p className="record-text mono-sm">{coin.obverse_legend}</p>}
              {coin.obverse_desc && <p className="record-text">{coin.obverse_desc}</p>}
            </section>
          )}

          {(coin.reverse_legend || coin.reverse_desc) && (
            <section className="record-section">
              <h3 className="record-heading">Reverse</h3>
              {coin.reverse_legend && <p className="record-text mono-sm">{coin.reverse_legend}</p>}
              {coin.reverse_desc && <p className="record-text">{coin.reverse_desc}</p>}
            </section>
          )}
        </div>
      </div>

      {/* Bottom Section: The Story */}
      {(coin.story || coin.provenance) && (
        <div className="detail-story">
          {coin.story && (
            <section className="story-section">
              <h3 className="story-heading">Curator's Note</h3>
              <div className="story-content">
                {coin.story.split('\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>
          )}
          
          {coin.provenance && (
            <section className="story-section">
              <h3 className="story-heading">Provenance</h3>
              <p className="provenance-text">{coin.provenance}</p>
            </section>
          )}
        </div>
      )}

      {/* Image Zoom Modal */}
      {isZoomOpen && mainImage && (
        <div className="zoom-modal" onClick={() => setIsZoomOpen(false)}>
          <div className="zoom-content" onClick={e => e.stopPropagation()}>
            <button className="zoom-close" onClick={() => setIsZoomOpen(false)}>×</button>
            <img 
              src={getImageUrl(mainImage.path)} 
              alt={mainImage.label || coin.title} 
              className="zoom-image"
            />
          </div>
        </div>
      )}
    </div>
  );
};
