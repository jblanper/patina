import React, { useState, useRef, useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';

interface SelectionToolbarProps {
  count: number;
  onBulkEdit: () => void;
  onBulkDelete: () => void;
  onExportZip: () => void;
  onExportPdf: () => void;
  onClearSelection: () => void;
  disabled?: boolean;
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  count,
  onBulkEdit,
  onBulkDelete,
  onExportZip,
  onExportPdf,
  onClearSelection,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const countLabelId = useId();

  useEffect(() => {
    if (disabled) setActionsOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!actionsOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [actionsOpen]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActionsOpen(prev => !prev);
    }
  };

  const handleMenuItemKeyDown = (e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
      setActionsOpen(false);
    }
  };

  return (
    <div
      className="selection-toolbar"
      role="toolbar"
      aria-label={t('cabinet.selectionToolbar')}
    >
      {/* Left: count + clear — always visible in list view */}
      <div className="selection-toolbar-left">
        <span
          id={countLabelId}
          className="selection-count"
          aria-live="polite"
          aria-atomic="true"
        >
          {t('cabinet.selectedCount', { count })}
        </span>
        <button
          className="btn-ghost"
          onClick={!disabled ? onClearSelection : undefined}
          type="button"
          aria-label={t('cabinet.clearSelection')}
          aria-disabled={disabled}
          disabled={disabled}
        >
          ✕ {t('cabinet.clearSelection')}
        </button>
      </div>

      {/* Right: single Actions ▾ dropdown */}
      <div className="toolbar-actions-right" ref={actionsMenuRef}>
        <button
          className="btn-tools"
          onClick={() => !disabled && setActionsOpen(prev => !prev)}
          onKeyDown={handleTriggerKeyDown}
          aria-expanded={disabled ? false : actionsOpen}
          aria-haspopup="menu"
          aria-disabled={disabled}
          disabled={disabled}
          type="button"
        >
          {t('cabinet.actions')} ▾
        </button>
        {actionsOpen && (
          <div
            className="tools-dropdown"
            role="menu"
            style={{ right: 0, left: 'auto' }}
          >
            <button
              className="tools-dropdown-item"
              role="menuitem"
              type="button"
              onClick={() => { onBulkEdit(); setActionsOpen(false); }}
              onKeyDown={e => handleMenuItemKeyDown(e, onBulkEdit)}
            >
              {t('cabinet.bulkEdit')}
            </button>
            <button
              className="tools-dropdown-item tools-dropdown-item--danger"
              role="menuitem"
              type="button"
              onClick={() => { onBulkDelete(); setActionsOpen(false); }}
              onKeyDown={e => handleMenuItemKeyDown(e, onBulkDelete)}
              aria-describedby={countLabelId}
            >
              {t('cabinet.bulkDelete')}
            </button>
            <button
              className="tools-dropdown-item"
              role="menuitem"
              type="button"
              onClick={() => { onExportZip(); setActionsOpen(false); }}
              onKeyDown={e => handleMenuItemKeyDown(e, onExportZip)}
            >
              {t('cabinet.exportArchive')}
            </button>
            <button
              className="tools-dropdown-item"
              role="menuitem"
              type="button"
              onClick={() => { onExportPdf(); setActionsOpen(false); }}
              onKeyDown={e => handleMenuItemKeyDown(e, onExportPdf)}
            >
              {t('cabinet.generateCatalog')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

SelectionToolbar.displayName = 'SelectionToolbar';
