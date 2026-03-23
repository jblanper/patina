import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFieldVisibility } from '../hooks/useFieldVisibility';
import {
  LOCKED_VISIBILITY_KEYS,
  type VisibilityKey,
} from '../../common/validation';

export type DrawerTab    = 'ledger' | 'card';
export type DrawerAnchor = 'left'   | 'right';

interface FieldVisibilityDrawerProps {
  isOpen:      boolean;
  onClose:     () => void;
  defaultTab?: DrawerTab;
  anchor?:     DrawerAnchor;
}

type FieldEntry = { key: VisibilityKey; sub?: string };

const LEDGER_GROUPS: { section: string; i18nSection: string; fields: FieldEntry[] }[] = [
  {
    section: 'identity',
    i18nSection: 'visibility.section.identity',
    fields: [
      { key: 'ledger.title' },
      { key: 'ledger.issuer' },
      { key: 'ledger.denomination' },
      { key: 'ledger.year' },
      { key: 'ledger.era' },
      { key: 'ledger.mint' },
    ],
  },
  {
    section: 'physical',
    i18nSection: 'visibility.section.physical',
    fields: [
      { key: 'ledger.metal' },
      { key: 'ledger.weight' },
      { key: 'ledger.diameter' },
      { key: 'ledger.die_axis',  sub: 'visibility.expertField' },
      { key: 'ledger.fineness',  sub: 'visibility.expertField' },
      { key: 'ledger.grade' },
    ],
  },
  {
    section: 'numismatic',
    i18nSection: 'visibility.section.numismatic',
    fields: [
      { key: 'ledger.obverse_legend' },
      { key: 'ledger.obverse_desc' },
      { key: 'ledger.reverse_legend' },
      { key: 'ledger.reverse_desc' },
      { key: 'ledger.edge_desc',    sub: 'visibility.expertField' },
      { key: 'ledger.catalog_ref' },
      { key: 'ledger.rarity' },
    ],
  },
  {
    section: 'narrative',
    i18nSection: 'visibility.section.narrative',
    fields: [
      { key: 'ledger.story' },
      { key: 'ledger.provenance', sub: 'visibility.privacySensitive' },
    ],
  },
  {
    section: 'acquisition',
    i18nSection: 'visibility.section.acquisition',
    fields: [
      { key: 'ledger.acquisition', sub: 'visibility.privacySensitive' },
    ],
  },
];

const CARD_FIELDS: FieldEntry[] = [
  { key: 'card.metal',  sub: 'visibility.alwaysVisible' },
  { key: 'card.year',   sub: 'visibility.alwaysVisible' },
  { key: 'card.grade' },
  { key: 'card.weight' },
];

export const FieldVisibilityDrawer: React.FC<FieldVisibilityDrawerProps> = ({
  isOpen,
  onClose,
  defaultTab = 'ledger',
  anchor = 'left',
}) => {
  const { t } = useTranslation();
  const { visibility, setVisibility, resetToDefaults } = useFieldVisibility();
  const [activeTab, setActiveTab] = useState<DrawerTab>(defaultTab);

  useEffect(() => {
    if (isOpen) setActiveTab(defaultTab);
  }, [isOpen, defaultTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const drawerClass = [
    'fv-drawer',
    `fv-drawer--${anchor}`,
    isOpen ? 'open' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      {isOpen && (
        <div
          className="fv-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={drawerClass}
        role="dialog"
        aria-label={t('visibility.drawer.title')}
        aria-modal="true"
      >
        <div className="fv-drawer-header">
          <span className="fv-drawer-title">{t('visibility.drawer.title')}</span>
          <button
            className="fv-drawer-close"
            onClick={onClose}
            aria-label={t('visibility.drawer.close')}
          >
            {t('visibility.drawer.close')} ✕
          </button>
        </div>

        <div className="fv-tabs" role="tablist">
          <button
            className={`fv-tab ${activeTab === 'ledger' ? 'active' : ''}`}
            onClick={() => setActiveTab('ledger')}
            role="tab"
            aria-selected={activeTab === 'ledger'}
            aria-controls="fv-panel-ledger"
          >
            {t('visibility.tab.ledger')}
          </button>
          <button
            className={`fv-tab ${activeTab === 'card' ? 'active' : ''}`}
            onClick={() => setActiveTab('card')}
            role="tab"
            aria-selected={activeTab === 'card'}
            aria-controls="fv-panel-card"
          >
            {t('visibility.tab.card')}
          </button>
        </div>

        <div className="fv-drawer-body">
          <div
            id="fv-panel-ledger"
            role="tabpanel"
            hidden={activeTab !== 'ledger'}
          >
            {LEDGER_GROUPS.map(group => (
              <div key={group.section} className="fv-section">
                <div className="fv-section-head">{t(group.i18nSection)}</div>
                {group.fields.map(({ key, sub }) => (
                  <FieldRow
                    key={key}
                    fieldKey={key}
                    label={t(`visibility.field.${keyToI18n(key)}`)}
                    sub={sub ? t(sub) : undefined}
                    checked={visibility[key]}
                    locked={LOCKED_VISIBILITY_KEYS.has(key)}
                    onChange={() => setVisibility(key, !visibility[key])}
                  />
                ))}
              </div>
            ))}
          </div>

          <div
            id="fv-panel-card"
            role="tabpanel"
            hidden={activeTab !== 'card'}
          >
            <div className="fv-section">
              <div className="fv-section-head">{t('visibility.section.card')}</div>
              <p className="fv-card-note">{t('visibility.cardNote')}</p>
              {CARD_FIELDS.map(({ key, sub }) => (
                <FieldRow
                  key={key}
                  fieldKey={key}
                  label={t(`visibility.field.${keyToI18n(key)}`)}
                  sub={sub ? t(sub) : undefined}
                  checked={visibility[key]}
                  locked={LOCKED_VISIBILITY_KEYS.has(key)}
                  onChange={() => setVisibility(key, !visibility[key])}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="fv-drawer-footer">
          <span className="fv-live-badge">{t('visibility.liveIndicator')}</span>
          <button className="fv-reset-btn" onClick={resetToDefaults}>
            {t('visibility.resetToDefaults')}
          </button>
        </div>
      </div>
    </>
  );
};

interface FieldRowProps {
  fieldKey: VisibilityKey;
  label:    string;
  sub?:     string;
  checked:  boolean;
  locked:   boolean;
  onChange: () => void;
}

const FieldRow: React.FC<FieldRowProps> = ({
  label, sub, checked, locked, onChange,
}) => (
  <div className="fv-field-row">
    <div className="fv-field-labels">
      <span className="fv-field-name">{label}</span>
      {sub && <span className="fv-field-sub">{sub}</span>}
    </div>
    <button
      className={`fv-toggle ${checked ? 'on' : ''} ${locked ? 'locked' : ''}`}
      onClick={locked ? undefined : onChange}
      aria-pressed={checked}
      aria-label={label}
      aria-disabled={locked}
      disabled={locked}
    />
  </div>
);

// 'ledger.die_axis' → 'dieAxis'  |  'card.grade' → 'cardGrade'
export function keyToI18n(key: VisibilityKey): string {
  const [surface, ...rest] = key.split('.');
  const camel = rest
    .join('.')
    .replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  return surface === 'card' ? `card${camel.charAt(0).toUpperCase()}${camel.slice(1)}` : camel;
}

