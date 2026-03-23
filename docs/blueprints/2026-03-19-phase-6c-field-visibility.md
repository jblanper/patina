# Implementation Blueprint: Phase 6c — Field Visibility Settings

**Date:** 2026-03-19 (revised 2026-03-23)
**Status:** Approved
**Reference:** `docs/technical_plan.md`
**UI Proposal:** `docs/curating-ui/proposal_field_visibility_2026-03-23.html` — Path A (The Annotation Drawer, revised) selected.

## 1. Objective

Allow collectors to globally toggle which fields appear in the Ledger (CoinDetail) and on Gallery Cards (CoinCard). Preferences are stored in SQLite and applied live — no page reload, no navigation away from the current surface.

### Philosophical Alignment
- [x] **Archival Ledger Aesthetic:** A 340px drawer slides in from the left in the Ledger (overlapping the coin plate, not the text record) and from the right in the Cabinet (sidebar occupies the left). The gesture is surgical — like adjusting a display case while standing in front of it.
- [x] **Privacy First:** All preferences stored locally in SQLite. No external sync, no localStorage.
- [x] **Single-Click Rule:** "Customize Display" text link is one click from any Ledger or Cabinet view.

---

## 2. Technical Strategy

### A. Database Schema

**Add to `SCHEMA` array in `src/common/schema.ts`:**

```typescript
{
  name: 'field_visibility',
  sql: `CREATE TABLE IF NOT EXISTS field_visibility (
    key        TEXT PRIMARY KEY,
    visible    INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`,
}
```

`sort_order` is reserved for future drag-to-reorder. Do not expose it in any UI or IPC handler now.

**Seed rows — add to `src/main/db.ts` as `DEFAULT_FIELD_VISIBILITY`:**

```typescript
export const DEFAULT_FIELD_VISIBILITY: Record<string, boolean> = {
  // ── Identity ────────────────────────────────────
  'ledger.title':        true,   // locked — never toggle-able
  'ledger.issuer':       true,
  'ledger.denomination': true,
  'ledger.year':         true,
  'ledger.era':          true,
  'ledger.mint':         true,
  // ── Physical Metrics ────────────────────────────
  'ledger.metal':        true,
  'ledger.weight':       true,   // locked — never toggle-able
  'ledger.diameter':     true,   // locked — never toggle-able
  'ledger.die_axis':     false,  // expert field
  'ledger.fineness':     false,  // expert field
  'ledger.grade':        true,
  // ── Numismatic Data ─────────────────────────────
  'ledger.obverse_legend': true,
  'ledger.obverse_desc':   true,
  'ledger.reverse_legend': true,
  'ledger.reverse_desc':   true,
  'ledger.edge_desc':      false, // expert field
  'ledger.catalog_ref':    true,
  'ledger.rarity':         true,
  // ── Narrative ───────────────────────────────────
  'ledger.story':        true,
  'ledger.provenance':   false,  // privacy-sensitive
  // ── Acquisition ─────────────────────────────────
  'ledger.acquisition':  false,  // privacy-sensitive
  // ── Gallery Card ────────────────────────────────
  'card.metal':          true,   // locked — never toggle-able
  'card.year':           true,   // locked — never toggle-able
  'card.grade':          true,   // corrected from original false (§8 finding)
  'card.weight':         true,   // added (§8 finding)
};
```

> **`card.diameter` is intentionally absent.** `CoinCard.tsx` currently renders `diameter` as a hardcoded metric. It is not part of the visibility system in this phase. If it needs to be controllable in future, add `card.diameter` to this map and handle it in `CoinCard.tsx` at that time.

**Bump `CURRENT_SEED_VERSION`** in `src/main/db.ts` to trigger re-seed on first launch after deployment.

**Seeding logic** — call `seedFieldVisibility()` from `DatabaseService.initialize()`:

```typescript
private seedFieldVisibility(): void {
  const insert = this.db.prepare(
    `INSERT OR IGNORE INTO field_visibility (key, visible) VALUES (?, ?)`
  );
  const insertAll = this.db.transaction(() => {
    for (const [key, visible] of Object.entries(DEFAULT_FIELD_VISIBILITY)) {
      insert.run(key, visible ? 1 : 0);
    }
  });
  insertAll();
}
```

`INSERT OR IGNORE` ensures existing user preferences are never overwritten on re-seed. A `CURRENT_SEED_VERSION` bump only triggers the call — it does not reset user preferences.

---

### B. Shared Types & Validation (`src/common/`)

#### `src/common/validation.ts` — add after existing schemas

```typescript
export const ALLOWED_VISIBILITY_KEYS = [
  'ledger.title', 'ledger.issuer', 'ledger.denomination', 'ledger.year',
  'ledger.era', 'ledger.mint', 'ledger.metal', 'ledger.weight',
  'ledger.diameter', 'ledger.die_axis', 'ledger.fineness', 'ledger.grade',
  'ledger.obverse_legend', 'ledger.obverse_desc', 'ledger.reverse_legend',
  'ledger.reverse_desc', 'ledger.edge_desc', 'ledger.catalog_ref',
  'ledger.rarity', 'ledger.provenance', 'ledger.story', 'ledger.acquisition',
  'card.metal', 'card.year', 'card.grade', 'card.weight',
] as const;

export type VisibilityKey = typeof ALLOWED_VISIBILITY_KEYS[number];

// Used by IPC handler prefs:setVisibility — The Filter enforces this
export const SetVisibilitySchema = z.object({
  key:     z.enum(ALLOWED_VISIBILITY_KEYS),
  visible: z.boolean(),
}).strict();

// Keys the user cannot toggle off — locked in drawer UI and ignored if
// somehow submitted to setVisibility
export const LOCKED_VISIBILITY_KEYS: ReadonlySet<VisibilityKey> = new Set([
  'ledger.title', 'ledger.weight', 'ledger.diameter',
  'card.metal', 'card.year',
]);
```

#### `src/common/types.ts` — add type alias

```typescript
import type { VisibilityKey } from './validation';
export type FieldVisibilityMap = Record<VisibilityKey, boolean>;
```

---

### C. Main Process (`src/main/`)

#### `src/main/db.ts` — three new methods on `DatabaseService`

```typescript
getFieldVisibility(): FieldVisibilityMap {
  const rows = this.db
    .prepare('SELECT key, visible FROM field_visibility')
    .all() as { key: string; visible: number }[];

  // Start from defaults so any key missing from the DB still has a value
  const result = { ...DEFAULT_FIELD_VISIBILITY } as unknown as FieldVisibilityMap;
  for (const { key, visible } of rows) {
    if ((ALLOWED_VISIBILITY_KEYS as readonly string[]).includes(key)) {
      result[key as VisibilityKey] = visible === 1;
    }
  }
  return result;
}

setFieldVisibility(key: VisibilityKey, visible: boolean): void {
  this.db
    .prepare(
      `INSERT INTO field_visibility (key, visible) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET visible = excluded.visible`
    )
    .run(key, visible ? 1 : 0);
}

resetFieldVisibility(): FieldVisibilityMap {
  this.db.prepare('DELETE FROM field_visibility').run();
  this.seedFieldVisibility();
  return this.getFieldVisibility();
}
```

#### `src/main/index.ts` — three new IPC handlers

Place these alongside the other `prefs:*` handlers. All three go through The Filter.

```typescript
ipcMain.handle('prefs:getVisibility', (): FieldVisibilityMap => {
  return db.getFieldVisibility();
});

ipcMain.handle('prefs:setVisibility', (_event, raw: unknown): void => {
  const { key, visible } = SetVisibilitySchema.parse(raw); // throws ZodError on invalid input
  if (LOCKED_VISIBILITY_KEYS.has(key)) return;             // silently ignore locked keys
  db.setFieldVisibility(key, visible);
});

ipcMain.handle('prefs:resetVisibility', (): FieldVisibilityMap => {
  return db.resetFieldVisibility();
});
```

> **The Filter:** `SetVisibilitySchema.parse(raw)` rejects any unknown key with a thrown `ZodError` before it touches the database. The `LOCKED_VISIBILITY_KEYS` guard is a second line of defence — locked keys cannot be changed even if a valid schema value is sent.

#### `src/main/preload.ts` — extend the `electronAPI` bridge

Add to the `contextBridge.exposeInMainWorld` object:

```typescript
prefsGetVisibility:   (): Promise<FieldVisibilityMap> =>
  ipcRenderer.invoke('prefs:getVisibility'),

prefsSetVisibility:   (key: string, visible: boolean): Promise<void> =>
  ipcRenderer.invoke('prefs:setVisibility', { key, visible }),

prefsResetVisibility: (): Promise<FieldVisibilityMap> =>
  ipcRenderer.invoke('prefs:resetVisibility'),
```

Also add the corresponding signatures to the `ElectronAPI` interface (or wherever the window type is declared):

```typescript
prefsGetVisibility:   () => Promise<FieldVisibilityMap>;
prefsSetVisibility:   (key: string, visible: boolean) => Promise<void>;
prefsResetVisibility: () => Promise<FieldVisibilityMap>;
```

---

### D. Renderer: Context & Hook

#### `src/renderer/context/FieldVisibilityContext.tsx` — new file

```tsx
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_FIELD_VISIBILITY } from '../../main/db';   // shared constant
import type { FieldVisibilityMap, VisibilityKey } from '../../common/types';
import { LOCKED_VISIBILITY_KEYS } from '../../common/validation';

interface FieldVisibilityContextValue {
  visibility:       FieldVisibilityMap;
  isVisible:        (key: VisibilityKey) => boolean;
  setVisibility:    (key: VisibilityKey, visible: boolean) => Promise<void>;
  resetToDefaults:  () => Promise<void>;
}

export const FieldVisibilityContext =
  createContext<FieldVisibilityContextValue | null>(null);

export const FieldVisibilityProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [visibility, setVisibilityState] = useState<FieldVisibilityMap>(
    DEFAULT_FIELD_VISIBILITY as unknown as FieldVisibilityMap
  );

  // Load persisted preferences on mount — single IPC call, cached for the session
  useEffect(() => {
    window.electronAPI.prefsGetVisibility().then(setVisibilityState);
  }, []);

  const setVisibility = useCallback(async (key: VisibilityKey, visible: boolean) => {
    if (LOCKED_VISIBILITY_KEYS.has(key)) return;
    // Optimistic update first — UI reacts immediately, IPC follows
    setVisibilityState(prev => ({ ...prev, [key]: visible }));
    await window.electronAPI.prefsSetVisibility(key, visible);
  }, []);

  const resetToDefaults = useCallback(async () => {
    const fresh = await window.electronAPI.prefsResetVisibility();
    setVisibilityState(fresh);
  }, []);

  const isVisible = useCallback(
    (key: VisibilityKey) => visibility[key] ?? true,
    [visibility]
  );

  return (
    <FieldVisibilityContext.Provider
      value={{ visibility, isVisible, setVisibility, resetToDefaults }}
    >
      {children}
    </FieldVisibilityContext.Provider>
  );
};
```

> **Optimistic update:** `setVisibilityState` is called before `await ipcRenderer.invoke(...)`. The Ledger reacts in the same frame as the toggle click. If the IPC call fails (shouldn't happen for a local SQLite write), a production build would add a rollback here — out of scope for this phase.

> **`DEFAULT_FIELD_VISIBILITY` is imported from `src/main/db.ts`.** This is the one place where renderer imports from `src/main/` — acceptable only for a plain data constant (no Node.js APIs). If this causes bundler issues, move `DEFAULT_FIELD_VISIBILITY` to `src/common/validation.ts`.

#### `src/renderer/hooks/useFieldVisibility.ts` — new file

```typescript
import { useContext } from 'react';
import { FieldVisibilityContext } from '../context/FieldVisibilityContext';

export const useFieldVisibility = () => {
  const ctx = useContext(FieldVisibilityContext);
  if (!ctx) throw new Error('useFieldVisibility must be used within FieldVisibilityProvider');
  return ctx;
};
```

#### `src/renderer/App.tsx` — wrap the router

```tsx
import { FieldVisibilityProvider } from './context/FieldVisibilityContext';

// Wrap the existing <HashRouter> (or its contents) with the provider:
<FieldVisibilityProvider>
  <HashRouter>
    {/* existing routes */}
  </HashRouter>
</FieldVisibilityProvider>
```

The provider sits outside the router so the same context instance is available on every route without re-mounting.

---

### E. Renderer: The Annotation Drawer Component

#### `src/renderer/components/FieldVisibilityDrawer.tsx` — new file

```tsx
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFieldVisibility } from '../hooks/useFieldVisibility';
import {
  ALLOWED_VISIBILITY_KEYS,
  LOCKED_VISIBILITY_KEYS,
  type VisibilityKey,
} from '../../common/validation';

export type DrawerTab    = 'ledger' | 'card';
export type DrawerAnchor = 'left'   | 'right';

interface FieldVisibilityDrawerProps {
  isOpen:      boolean;
  onClose:     () => void;
  defaultTab?: DrawerTab;    // which tab is active when the drawer opens
  anchor?:     DrawerAnchor; // 'left' in Ledger, 'right' in Cabinet
}

// ── Field group definitions ────────────────────────────────────────────────
// Each entry: [key, subLabel?]
// subLabel renders beneath the field name in --text-muted mono type

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

// ── Component ──────────────────────────────────────────────────────────────

export const FieldVisibilityDrawer: React.FC<FieldVisibilityDrawerProps> = ({
  isOpen,
  onClose,
  defaultTab = 'ledger',
  anchor = 'left',
}) => {
  const { t } = useTranslation();
  const { visibility, setVisibility, resetToDefaults } = useFieldVisibility();
  const [activeTab, setActiveTab] = useState<DrawerTab>(defaultTab);

  // Reset to the correct default tab each time the drawer opens
  useEffect(() => {
    if (isOpen) setActiveTab(defaultTab);
  }, [isOpen, defaultTab]);

  // Close on Escape key
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
      {/* Backdrop — closes drawer on click */}
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
        {/* ── Header ── */}
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

        {/* ── Tabs ── */}
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

        {/* ── Body ── */}
        <div className="fv-drawer-body">

          {/* Ledger panel */}
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

          {/* Card panel */}
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

        {/* ── Footer ── */}
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

// ── Sub-component: individual field row ──────────────────────────────────

interface FieldRowProps {
  fieldKey: VisibilityKey;
  label:    string;
  sub?:     string;
  checked:  boolean;
  locked:   boolean;
  onChange: () => void;
}

const FieldRow: React.FC<FieldRowProps> = ({
  fieldKey, label, sub, checked, locked, onChange,
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

// ── Helper: convert visibility key to i18n sub-key ───────────────────────
// 'ledger.die_axis' → 'dieAxis'  |  'card.grade' → 'cardGrade'

function keyToI18n(key: VisibilityKey): string {
  const [surface, ...rest] = key.split('.');
  const camel = rest
    .join('.')
    .replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  return surface === 'card' ? `card${camel.charAt(0).toUpperCase()}${camel.slice(1)}` : camel;
}
```

---

### F. Renderer: Trigger Integration

#### `src/renderer/components/CoinDetail.tsx` — add drawer state + trigger

```tsx
import { FieldVisibilityDrawer } from './FieldVisibilityDrawer';
import { useFieldVisibility } from '../hooks/useFieldVisibility';

// Inside the component:
const [drawerOpen, setDrawerOpen] = useState(false);
const { isVisible } = useFieldVisibility();

// In the <header className="app-header"> — add between Edit and Delete:
<button
  className="btn-customize"
  onClick={() => setDrawerOpen(true)}
  aria-label={t('detail.customizeDisplay')}
>
  {t('detail.customizeDisplay')}
</button>

// Immediately after <header>:
<FieldVisibilityDrawer
  isOpen={drawerOpen}
  onClose={() => setDrawerOpen(false)}
  defaultTab="ledger"
  anchor="left"
/>
```

**Conditional field rendering — apply `isVisible` to every field in the right folio.**

Below are the exact wrapping changes for each section. Wrap each controlled metric item and section block. Fields marked **locked** in `LOCKED_VISIBILITY_KEYS` do not need `isVisible()` guards — they are always rendered.

```tsx
{/* Physical Metrics grid — controlled fields */}
<div className="metrics-grid">
  {/* weight: locked — always rendered, no guard */}
  <div className="metric-item">...</div>

  {/* diameter: locked — always rendered, no guard */}
  <div className="metric-item">...</div>

  {isVisible('ledger.die_axis') && (
    <div className="metric-item">
      <span className="metric-label">{t('ledger.dieAxis')}</span>
      <span className="metric-value">{coin.die_axis || '—'}</span>
    </div>
  )}

  {/* metal: no lock in LOCKED_VISIBILITY_KEYS — user may hide it */}
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
</div>

{/* Numismatic section — obverse */}
{isVisible('ledger.obverse_legend') || isVisible('ledger.obverse_desc') ? (
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

{/* reverse — same pattern as obverse */}
{isVisible('ledger.reverse_legend') || isVisible('ledger.reverse_desc') ? (
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

{/* Curator's Note */}
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

{/* Provenance */}
{isVisible('ledger.provenance') && coin.provenance && (
  <div className="numismatic-section">
    <span className="section-label">{t('ledger.provenance')}</span>
    <div className="provenance-note">{coin.provenance}</div>
  </div>
)}

{/* Acquisition footer — isVisible('ledger.acquisition') wraps the entire footer */}
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
```

> **The folio header (`ledger.title`, `ledger.issuer`, `ledger.era`, `ledger.mint`, `ledger.year`, `ledger.denomination`, `ledger.catalog_ref`, `ledger.rarity`)** are also visibility-controlled but rendered in the `folio-header` block at the top of the right folio, not in the sections above. Apply the same `isVisible(...)` pattern there:
>
> - `ledger.title` is locked (always visible)
> - `ledger.issuer`, `ledger.era`: shown in the `meta-line` span — wrap each with `{isVisible('ledger.issuer') && ...}`
> - `ledger.mint`, `ledger.year`, `ledger.catalog_ref`: shown in the `subtitle` div — wrap each fragment
> - `ledger.denomination` and `ledger.rarity`: shown wherever they appear in the right folio

#### `src/renderer/components/Cabinet.tsx` — add drawer trigger

```tsx
import { FieldVisibilityDrawer } from './FieldVisibilityDrawer';
const [drawerOpen, setDrawerOpen] = useState(false);

// In the Cabinet header (wherever the search bar lives):
<button
  className="btn-customize"
  onClick={() => setDrawerOpen(true)}
  aria-label={t('cabinet.customizeDisplay')}
>
  {t('cabinet.customizeDisplay')}
</button>

// Somewhere in the Cabinet JSX (outside the grid, not inside an article):
<FieldVisibilityDrawer
  isOpen={drawerOpen}
  onClose={() => setDrawerOpen(false)}
  defaultTab="card"
  anchor="right"
/>
```

#### `src/renderer/components/CoinCard.tsx` — conditional badge rendering

`CoinCard` calls `useFieldVisibility()` directly. It is wrapped in `React.memo` — this is fine; context changes only re-render if the relevant key changes.

```tsx
import { useFieldVisibility } from '../hooks/useFieldVisibility';

// Inside component (before return):
const { isVisible } = useFieldVisibility();

// In the .coin-metrics row, replace the hardcoded metrics with:
<div className="coin-metrics">
  <span className="metric-metal">{coin.metal || '??'}</span>
  {/* diameter is hardcoded — not part of visibility system in this phase */}
  <span className="metric-divider">//</span>
  <span className="metric-weight">{formatWeight(coin.weight)}</span>
  <span className="metric-divider">//</span>
  <span className="metric-diameter">{formatDiameter(coin.diameter)}</span>
  {isVisible('card.grade') && coin.grade && (
    <>
      <span className="metric-divider">//</span>
      <span className="metric-grade">{coin.grade}</span>
    </>
  )}
</div>
```

> `card.metal`, `card.year`, and `card.weight` are already rendered. `card.weight` maps to the existing `metric-weight` span — it is already visible. The visibility key `card.weight` controls whether the user *can* hide it; since the default is `true`, no change in initial rendering. Only `card.grade` requires a new `<span>` to be added. Add `.metric-grade` to `index.css` matching the existing `.metric-metal` style.

---

### G. CSS — `src/renderer/styles/index.css`

Add the following block after the existing `/* ── Filter Overflow: The Soft Reveal ── */` section:

```css
/* ── Field Visibility Drawer ──────────────────────────────── */

.fv-overlay {
  position: fixed;
  inset: 0;
  background: rgba(45, 41, 38, 0.15);
  z-index: 200;
}

/* Base drawer — left-anchored (Ledger default) */
.fv-drawer {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 340px;
  background: var(--bg-manuscript);
  z-index: 201;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease;
}
.fv-drawer.fv-drawer--left {
  left: 0;
  border-right: 1px solid var(--border-hairline);
  transform: translateX(-100%);
}
.fv-drawer.fv-drawer--right {
  right: 0;
  border-left: 1px solid var(--border-hairline);
  transform: translateX(100%);
}
.fv-drawer.open {
  transform: translateX(0);
}

/* Drawer header */
.fv-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-hairline);
  flex-shrink: 0;
}
.fv-drawer-title {
  font-family: var(--font-serif);
  font-size: 1rem;
  font-weight: 700;
  font-style: italic;
}
.fv-drawer-close {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0;
  min-height: 44px; /* touch target */
  display: flex;
  align-items: center;
}
.fv-drawer-close:hover { color: var(--text-ink); }

/* Tabs */
.fv-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-hairline);
  flex-shrink: 0;
}
.fv-tab {
  flex: 1;
  padding: 0.65rem 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  color: var(--text-muted);
  min-height: 44px;
}
.fv-tab.active {
  color: var(--accent-manuscript);
  border-bottom-color: var(--accent-manuscript);
}
.fv-tab:hover:not(.active) { color: var(--text-ink); }

/* Scrollable body */
.fv-drawer-body {
  flex: 1;
  overflow-y: auto;
}

/* Section header */
.fv-section {
  border-bottom: 1px solid var(--border-hairline);
}
.fv-section-head {
  padding: 0.55rem 1.25rem 0.4rem;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--text-muted);
  background: var(--stone-pedestal);
}

/* Field row */
.fv-field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 1.25rem;
  border-bottom: 1px solid var(--border-hairline);
  gap: 0.75rem;
}
.fv-field-row:last-child { border-bottom: none; }
.fv-field-labels {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}
.fv-field-name {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--text-ink);
  overflow-wrap: anywhere;
}
.fv-field-sub {
  font-family: var(--font-mono);
  font-size: 0.58rem;
  color: var(--text-muted);
}

/* Toggle pill */
.fv-toggle {
  width: 34px;
  height: 18px;
  flex-shrink: 0;
  background: var(--border-hairline);
  border: none;
  border-radius: 9px;
  position: relative;
  cursor: pointer;
  transition: background 0.15s;
  min-height: 44px; /* expand touch target vertically via padding */
  padding: 13px 0;
  background-clip: content-box;
}
.fv-toggle::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 2px;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  transition: left 0.15s;
}
.fv-toggle.on {
  background-color: var(--accent-manuscript);
  background-clip: content-box;
}
.fv-toggle.on::after { left: 18px; }
.fv-toggle.locked {
  opacity: 0.4;
  cursor: default;
}

/* Card note */
.fv-card-note {
  font-size: 0.72rem;
  color: var(--text-muted);
  line-height: 1.5;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--border-hairline);
}

/* Drawer footer */
.fv-drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--border-hairline);
  flex-shrink: 0;
}
.fv-live-badge {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #4a7c4e; /* intentional: not a design token — success green, used sparingly */
}
.fv-reset-btn {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  background: none;
  border: none;
  border-bottom: 1px solid var(--border-hairline);
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.1rem 0;
  min-height: 44px;
  display: flex;
  align-items: center;
}
.fv-reset-btn:hover {
  color: var(--accent-manuscript);
  border-color: var(--accent-manuscript);
}

/* Trigger button — shared by Ledger and Cabinet headers */
.btn-customize {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  background: none;
  border: none;
  border-bottom: 1px solid var(--border-hairline);
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.1rem 0;
}
.btn-customize:hover,
.btn-customize[aria-expanded="true"] {
  color: var(--accent-manuscript);
  border-color: var(--accent-manuscript);
}

/* CoinCard — grade badge (new) */
.metric-grade {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--accent-manuscript);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

---

### H. i18n Keys

Add to **both** `src/renderer/i18n/locales/en.json` and `src/renderer/i18n/locales/es.json`.

**English (`en.json`):**
```json
"detail": {
  "customizeDisplay": "Customize Display"
},
"cabinet": {
  "customizeDisplay": "Customize Display"
},
"visibility": {
  "drawer": {
    "title": "Display Settings",
    "close": "Close"
  },
  "tab": {
    "ledger": "Ledger",
    "card": "Gallery Card"
  },
  "section": {
    "identity":    "Identity",
    "physical":    "Physical Metrics",
    "numismatic":  "Numismatic Data",
    "narrative":   "Narrative",
    "acquisition": "Acquisition",
    "card":        "Gallery Card Fields"
  },
  "field": {
    "title":          "Title",
    "issuer":         "Issuer",
    "denomination":   "Denomination",
    "year":           "Year",
    "era":            "Era",
    "mint":           "Mint",
    "metal":          "Metal",
    "weight":         "Weight",
    "diameter":       "Diameter",
    "dieAxis":        "Die Axis",
    "fineness":       "Fineness",
    "grade":          "Grade",
    "obverseLegend":  "Obverse Legend",
    "obverseDesc":    "Obverse Description",
    "reverseLegend":  "Reverse Legend",
    "reverseDesc":    "Reverse Description",
    "edgeDesc":       "Edge Description",
    "catalogRef":     "Catalog Reference",
    "rarity":         "Rarity",
    "provenance":     "Provenance",
    "story":          "Curator's Note",
    "acquisition":    "Acquisition Details",
    "cardMetal":      "Metal",
    "cardYear":       "Year",
    "cardGrade":      "Grade",
    "cardWeight":     "Weight"
  },
  "expertField":      "Expert field",
  "alwaysVisible":    "Always visible",
  "privacySensitive": "Privacy-sensitive",
  "resetToDefaults":  "Reset to Defaults",
  "liveIndicator":    "● Live",
  "cardNote":         "These badges appear on every card in the gallery. Keep this list short."
}
```

**Spanish (`es.json`) — add the same keys:**
```json
"detail": {
  "customizeDisplay": "Personalizar Vista"
},
"cabinet": {
  "customizeDisplay": "Personalizar Vista"
},
"visibility": {
  "drawer": {
    "title": "Configuración de Pantalla",
    "close": "Cerrar"
  },
  "tab": {
    "ledger": "Ficha",
    "card":   "Tarjeta de Galería"
  },
  "section": {
    "identity":    "Identidad",
    "physical":    "Métricas Físicas",
    "numismatic":  "Datos Numismáticos",
    "narrative":   "Narrativa",
    "acquisition": "Adquisición",
    "card":        "Campos de Tarjeta"
  },
  "field": {
    "title":          "Título",
    "issuer":         "Emisor",
    "denomination":   "Denominación",
    "year":           "Año",
    "era":            "Era",
    "mint":           "Ceca",
    "metal":          "Metal",
    "weight":         "Peso",
    "diameter":       "Diámetro",
    "dieAxis":        "Eje de Cuño",
    "fineness":       "Ley",
    "grade":          "Grado",
    "obverseLegend":  "Leyenda del Anverso",
    "obverseDesc":    "Descripción del Anverso",
    "reverseLegend":  "Leyenda del Reverso",
    "reverseDesc":    "Descripción del Reverso",
    "edgeDesc":       "Descripción del Canto",
    "catalogRef":     "Referencia de Catálogo",
    "rarity":         "Rareza",
    "provenance":     "Procedencia",
    "story":          "Nota del Curador",
    "acquisition":    "Detalles de Adquisición",
    "cardMetal":      "Metal",
    "cardYear":       "Año",
    "cardGrade":      "Grado",
    "cardWeight":     "Peso"
  },
  "expertField":      "Campo experto",
  "alwaysVisible":    "Siempre visible",
  "privacySensitive": "Dato privado",
  "resetToDefaults":  "Restaurar valores predeterminados",
  "liveIndicator":    "● En vivo",
  "cardNote":         "Estos datos aparecen en cada tarjeta de la galería. Mantén la lista corta."
}
```

---

## 3. Verification Strategy

### Files & Colocation

| Test file | Tests |
|---|---|
| `src/main/__tests__/db.test.ts` | DB CRUD for `getFieldVisibility`, `setFieldVisibility`, `resetFieldVisibility` |
| `src/renderer/hooks/__tests__/useFieldVisibility.test.ts` | Context read, `setVisibility`, `resetToDefaults`, locked key guard |
| `src/renderer/components/__tests__/FieldVisibilityDrawer.test.tsx` | Render, tabs, toggles, close, escape, locked state, reset |
| `src/renderer/components/__tests__/CoinDetail.test.tsx` | Conditional field rendering per visibility state |
| `src/renderer/components/__tests__/CoinCard.test.tsx` | Grade badge shows/hides based on `card.grade` visibility |
| `src/renderer/i18n/__tests__/translations.test.ts` | Key parity (existing test — will catch missing keys automatically) |

### Mock Strategy

**`window.electronAPI` mocks (add to `setupTests.ts` global mock):**
```typescript
prefsGetVisibility:   vi.fn().mockResolvedValue({ ...DEFAULT_FIELD_VISIBILITY }),
prefsSetVisibility:   vi.fn().mockResolvedValue(undefined),
prefsResetVisibility: vi.fn().mockResolvedValue({ ...DEFAULT_FIELD_VISIBILITY }),
```
Clear with `vi.clearAllMocks()` in `beforeEach` and set per-test as needed.

**`FieldVisibilityContext` in component tests:** wrap the component under test in `<FieldVisibilityProvider>` or provide a mock context value via a helper:
```typescript
const renderWithVisibility = (
  ui: React.ReactElement,
  overrides: Partial<FieldVisibilityMap> = {}
) => {
  const visibility = { ...DEFAULT_FIELD_VISIBILITY, ...overrides } as FieldVisibilityMap;
  return render(
    <FieldVisibilityContext.Provider
      value={{
        visibility,
        isVisible: (key) => visibility[key] ?? true,
        setVisibility: vi.fn(),
        resetToDefaults: vi.fn(),
      }}
    >
      {ui}
    </FieldVisibilityContext.Provider>
  );
};
```

### Coverage Targets

| Layer | Target | Rationale |
|---|---|---|
| `src/common/validation.ts` additions | 100% branch | Per existing project mandate |
| `useFieldVisibility.ts` | 90% function | Per hooks mandate |
| `FieldVisibilityDrawer.tsx` | 80% statement | Per components mandate |
| `CoinDetail.tsx` conditional rendering | 80% branch | Each `isVisible()` guard is a branch |
| `CoinCard.tsx` | 80% statement | Existing mandate |

### Key Test Cases

**`FieldVisibilityDrawer`:**
- Renders closed (no `.open` class) when `isOpen={false}`
- Renders open when `isOpen={true}`
- Pressing Escape fires `onClose`
- Clicking overlay fires `onClose`
- Clicking ✕ button fires `onClose`
- Ledger tab is active by default when `defaultTab="ledger"`
- Card tab is active by default when `defaultTab="card"`
- Clicking the inactive tab switches the panel
- Locked field toggle has `disabled` attribute and does not fire `setVisibility` when clicked
- Non-locked toggle fires `setVisibility(key, false)` when toggled from on-state
- "Reset to Defaults" button fires `resetToDefaults`

**`CoinDetail` conditional rendering:**
- When `isVisible('ledger.die_axis')` returns `false`, the Die Axis metric item is not in the DOM
- When `isVisible('ledger.die_axis')` returns `true`, it is in the DOM
- When `isVisible('ledger.acquisition')` returns `false`, the entire acquisition footer is absent
- When `isVisible('ledger.story')` returns `false` and `coin.story` is present, the Curator's Note section is absent

**`CoinCard`:**
- When `isVisible('card.grade')` returns `true` and `coin.grade` is present, `.metric-grade` is in the DOM
- When `isVisible('card.grade')` returns `false`, `.metric-grade` is not in the DOM
- When `coin.grade` is null/undefined, `.metric-grade` is not in the DOM regardless of visibility

---

## 4. Architectural Oversight (`curating-blueprints`)
**Status:** Verified

### Audit Findings:
- **System Integrity:** `FieldVisibilityProvider` is placed outside `<HashRouter>` in `App.tsx`. All five routes share the same context instance — no re-mount on navigation, no redundant IPC calls.
- **Abstraction:** The renderer never reads the `field_visibility` table directly. All access goes through `prefsGetVisibility / prefsSetVisibility / prefsResetVisibility`. The context layer caches the result for the session and provides optimistic updates.
- **Optimistic update pattern:** The context applies `setVisibilityState` before `await ipcRenderer.invoke(...)`. This ensures the Ledger reacts in the same frame as the toggle — zero perceptible latency. SQLite writes for single rows are synchronous at the OS level and will not fail under normal operation.
- **`DEFAULT_FIELD_VISIBILITY` location:** The constant is defined in `src/main/db.ts` and imported by the renderer context. If this creates bundler friction (esbuild / Vite treeshaking the Node side), relocate it to `src/common/validation.ts` — it has no runtime dependency on Node.js APIs.
- **No business logic in the bridge:** `preload.ts` passes `{ key, visible }` directly to the IPC handler. The bridge does not validate, filter, or transform — all logic lives in `SetVisibilitySchema.parse()` on the Main side.

### Review Notes:
- The `LOCKED_VISIBILITY_KEYS` guard in the IPC handler (`if (LOCKED_VISIBILITY_KEYS.has(key)) return;`) is a silent no-op, not an error. This is correct — the UI never sends locked keys (the button is `disabled`), so if this path is hit it indicates a programming error, not user error. A `console.warn` in development builds is acceptable.
- `sort_order` column is provisioned but unused. Do not expose it in any IPC handler or context value until drag-to-reorder is scoped.

---

## 5. Security Assessment (`securing-electron`)
**Status:** Verified

### Audit Findings:
- **The Filter:** `SetVisibilitySchema.parse(raw)` uses `.strict()` semantics via `z.enum(ALLOWED_VISIBILITY_KEYS)` — any key not in the enum throws `ZodError` before touching the database. This prevents key injection.
- **No user-generated content crosses the boundary:** Visibility keys are enum values (not user-typed strings). The `visible` field is `z.boolean()` — it cannot be used to inject SQL.
- **SQLite parameterisation:** `setFieldVisibility` uses a prepared statement with `?` placeholders. No string interpolation into SQL.
- **`contextIsolation: true` / `sandbox: true` preserved:** The three new bridge methods (`prefsGetVisibility`, `prefsSetVisibility`, `prefsResetVisibility`) follow the existing `contextBridge.exposeInMainWorld` pattern exactly. No raw `ipcRenderer` is exposed.
- **No new file-system access, no new protocols.** The feature is entirely SQLite read/write.

### Review Notes:
- The `LOCKED_VISIBILITY_KEYS` set in `src/common/validation.ts` is also imported by `src/main/index.ts`. Verify the import resolves correctly via the `src/common/` path (not a deep import from `src/renderer/`).
- `prefsResetVisibility` returns the full `FieldVisibilityMap` after reset. The returned object contains only boolean values keyed by the enum — no sensitive data.

---

## 6. Quality Assessment (`assuring-quality`)
**Status:** Verified

### Audit Findings:
- **Colocation:** All test files are colocated with their source (see §3 table).
- **Coverage:** `src/common/validation.ts` additions (new enum, new schema) must reach 100% branch. The `SetVisibilitySchema` has one branch: valid key → passes, invalid key → throws. Both must be tested.
- **Async safety:** `useFieldVisibility` tests must use `waitFor` when asserting state after `prefsGetVisibility` resolves. The initial `useEffect` in `FieldVisibilityProvider` is async.
- **`clearVocabCache()` not needed** — field visibility has no vocabulary cache interaction.
- **`FieldVisibilityDrawer` is synchronous** after mount — `fireEvent.click` is sufficient for toggle tests. No `waitFor` needed for the toggle interaction itself.
- **`CoinDetail` and `CoinCard` tests:** use the `renderWithVisibility` helper (defined in §3) to inject specific visibility states without real IPC.

### Review Notes:
- The `keyToI18n` helper in `FieldVisibilityDrawer.tsx` is a pure function with no side effects. It should have a dedicated unit test covering all key formats: `ledger.die_axis` → `dieAxis`, `card.grade` → `cardGrade`, `ledger.catalog_ref` → `catalogRef`.
- Test the `defaultTab` prop: assert the correct `aria-selected="true"` tab and `hidden` panel state on initial render for both `'ledger'` and `'card'` values.

---

## 7. UI Assessment (`curating-ui`)
**Status:** Verified

**Selected path:** Path A — The Annotation Drawer (revised variant).
**UI Proposal:** `docs/curating-ui/proposal_field_visibility_2026-03-23.html`

### Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Container | 340px fixed drawer | No navigation away; collector stays in context |
| Anchor — Ledger | **Left** | Overlaps coin plate, not the text record being configured |
| Anchor — Cabinet | **Right** | Left side occupied by PatinaSidebar (280px) |
| Save model | **Live-update** | Optimistic update; single IPC per toggle |
| Tab pre-selection | **Ledger** from CoinDetail; **Card** from Cabinet | Surfaces the relevant tab for the current context |
| Locked fields | Title, Weight, Diameter (ledger); Metal, Year (card) | Cannot be hidden; toggles rendered as disabled |
| Expert fields | Die Axis, Fineness, Edge Desc — default off | Not required for casual collecting; visible in drawer to enable |
| Privacy fields | Provenance, Acquisition — default off | Sensitive data; visible on demand |
| Apply button | None | Live-update model makes it redundant |

### CSS Implementation Rules
- Drawer uses `position: fixed` (not `absolute`) — anchors to viewport, unaffected by internal scroll within the right folio.
- `z-index: 201` for drawer, `z-index: 200` for overlay. These sit above `z-index: 100` used by the existing zoom modal.
- Transition: `transform 0.2s ease` only — do not animate `opacity` or `width`. Opacity animation on the overlay is not needed; the backdrop appears and disappears discretely.
- The `.fv-toggle` touch target reaches 44px via `padding: 13px 0` with `background-clip: content-box` — the pill itself is 18px tall, but the tappable area is 44px.
- `pointer-events` on the overlay must remain default (not `none`) — it needs to intercept clicks to close the drawer.
- Do **not** add `overflow: hidden` to `<body>` when the drawer is open. The Ledger's right folio scrolls independently; locking scroll would disrupt the reading experience.

### Accessibility
- The drawer has `role="dialog"` and `aria-modal="true"`. Screen readers will announce it as a dialog.
- Each toggle has `aria-pressed` (reflects on/off state) and `aria-label` (the field name). Locked toggles have `aria-disabled="true"` and `disabled` attribute.
- The tab group uses `role="tablist"` / `role="tab"` / `aria-selected` / `aria-controls`. Each panel uses `role="tabpanel"` / `hidden` (not CSS `display:none`) so screen readers skip hidden panels.
- Escape key closes the drawer (implemented in `useEffect` in `FieldVisibilityDrawer`).
- Focus is **not** programmatically moved to the drawer on open — the trigger button retains focus. This is intentional: the collector may want to continue reading the record while the drawer is visible.

---

## 8. Numismatic & UX Assessment (`curating-coins`)
**Status:** Issues Found → Resolved

### Resolved Issues from Original Assessment

| Finding | Resolution |
|---|---|
| `card.grade` defaulted to `false` | Changed to `true` in `DEFAULT_FIELD_VISIBILITY` |
| `card.weight` not in original schema | Added to `DEFAULT_FIELD_VISIBILITY` as `true` |

### Remaining Structural Notes (non-blocking)
- `ledger.metal` has dual identity (Identity + Physical Metric). It is grouped under Physical Metrics in the drawer for display purposes, but its semantic role spans both groups. This is acceptable.
- `ledger.grade` is technically a condition metric (per PCGS/NGC) grouped here under Physical Metrics. Acceptable for the drawer grouping.
- `card.diameter` is hardcoded in `CoinCard.tsx` and absent from the visibility schema. This is a documented intentional omission for this phase.
- Grade alphabetical sort in `availableGrades` remains unresolved — known limitation from Phase 6a, out of scope here.

---

## 9. User Consultation & Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Per-collection or global? | **Global** |
| 2 | Custom field groupings? | **Future enhancement** |
| 3 | Include "Reset to Defaults"? | **Yes** |
| 4 | Live-update or explicit Save? | **Live-update** |
| 5 | Panel, dedicated route, or inline mode? | **Path A — The Annotation Drawer (revised)** |
| 6 | Drawer anchor in Ledger? | **Left** (overlaps plate, preserves text record) |
| 7 | Drawer anchor in Cabinet? | **Right** (avoids sidebar conflict) |
| 8 | `card.diameter` in visibility system? | **No — hardcoded, out of scope** |
| 9 | `card.grade` default? | **True** (corrected per numismatic audit) |
| 10 | `card.weight` in schema? | **Yes, default true** (added per numismatic audit) |

---

## 10. Post-Implementation Retrospective
**Date:** Pending
**Outcome:** TBD

### Things to Consider
- Path B (dedicated `/preferences` route) may be worthwhile as a secondary entry point once the feature matures — good for initial collection setup sessions.
- Custom field ordering via drag-to-reorder is provisioned by the `sort_order` column. Implement when requested.
- When Phase 6a's vocabulary system covers Grade, `availableGrades` will be sortable by Sheldon scale — at that point review whether `card.grade` visibility behaviour needs updating.
- **Core Doc Revision:** After verification, add a "Field Visibility" section to the user guide and update `docs/style_guide.md §4` (Component Standards) with the `.fv-drawer` / `.fv-toggle` pattern.
