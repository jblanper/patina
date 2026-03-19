import React, { useState } from 'react';
import { useLens } from '../hooks/useLens';
import { QRCodeDisplay } from './Lens/QRCodeDisplay';

interface PlateEditorProps {
  onImageCaptured: (slot: 'obverse' | 'reverse' | 'edge', path: string) => void;
  images: {
    obverse?: string;
    reverse?: string;
    edge?: string;
  };
}

export const PlateEditor: React.FC<PlateEditorProps> = ({ onImageCaptured, images }) => {
  const { url, startLens } = useLens();
  const [activeSlot, setActiveSlot] = useState<'obverse' | 'reverse' | 'edge'>('obverse');
  const [showQR, setShowQR] = useState(false);

  const handleStartLens = async (slot: 'obverse' | 'reverse' | 'edge') => {
    setActiveSlot(slot);
    await startLens();
    setShowQR(true);
  };

  React.useEffect(() => {
    window.electronAPI.onLensImageReceived((path) => {
      onImageCaptured(activeSlot, path);
      setShowQR(false);
    });
    return () => {
      window.electronAPI.removeLensListeners();
    };
  }, [activeSlot, onImageCaptured]);

  const slots: Array<{ id: 'obverse' | 'reverse' | 'edge'; label: string }> = [
    { id: 'obverse', label: 'Obverse (Primary)' },
    { id: 'reverse', label: 'Reverse' },
    { id: 'edge', label: 'Edge' }
  ];

  return (
    <div className="left-folio">
      <div className="plate-stack">
        {slots.map((slot) => (
          <div key={slot.id} className={`plate-slot ${activeSlot === slot.id ? 'active' : ''}`} onClick={() => setActiveSlot(slot.id)}>
            <div className="plate-frame-edit">
              {images[slot.id] ? (
                <>
                  <img 
                    src={`patina-img://${images[slot.id]}`} 
                    alt={slot.label} 
                    className="plate-preview-img"
                  />
                  <div className="lens-cta-overlay">
                    <button 
                      className="btn-lens-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartLens(slot.id);
                      }}
                    >
                      Replace
                    </button>
                  </div>
                </>
              ) : (
                <div className="lens-cta-stack">
                  <div className="plate-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                  <button 
                    className="btn-lens-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartLens(slot.id);
                    }}
                  >
                    Establish Wireless Bridge
                  </button>
                  <button className="btn-lens-minimal">Import from Digital Archive</button>
                </div>
              )}
            </div>
            <div className="plate-caption">
              {slot.id === 'obverse' ? 'PLATE I' : slot.id === 'reverse' ? 'PLATE II' : 'PLATE III'} // {slot.label.toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      {showQR && url && (
        <div className="qr-overlay" onClick={() => setShowQR(false)}>
          <div className="qr-container" onClick={(e) => e.stopPropagation()}>
            <button className="qr-close" onClick={() => setShowQR(false)}>×</button>
            <QRCodeDisplay url={url} />
            <p className="qr-hint">Scan with mobile to capture <strong>{activeSlot.toUpperCase()}</strong></p>
          </div>
        </div>
      )}
    </div>
  );
};
