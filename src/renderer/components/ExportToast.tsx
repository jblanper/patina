import React, { useEffect } from 'react';

interface ExportToastProps {
  isVisible: boolean;
  type: 'success' | 'error';
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export const ExportToast: React.FC<ExportToastProps> = ({
  isVisible,
  type,
  message,
  onDismiss,
  duration = 5000
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onDismiss]);

  if (!isVisible) return null;

  return (
    <div 
      className={`export-toast export-toast-${type}`}
      role="status"
      aria-live="polite"
    >
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
};