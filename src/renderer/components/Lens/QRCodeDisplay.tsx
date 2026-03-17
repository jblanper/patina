import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeDisplayProps {
  url: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ url }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      backgroundColor: 'var(--color-parchment)',
      border: '1px solid var(--color-vellum)',
      borderRadius: '8px',
      boxShadow: 'inset 0 0 20px rgba(0,0,0,0.05)'
    }}>
      <QRCodeSVG 
        value={url} 
        size={256} 
        bgColor={"#FCF9F2"} // Parchment
        fgColor={"#2D2926"} // Iron Gall Ink
        level={"M"} 
        includeMargin={true}
      />
      <p style={{
        marginTop: '1.5rem',
        fontFamily: 'var(--font-serif)',
        color: 'var(--color-ink)',
        fontSize: '1.1rem',
        textAlign: 'center'
      }}>
        Scan with your mobile device<br/>to capture an image.
      </p>
    </div>
  );
};
