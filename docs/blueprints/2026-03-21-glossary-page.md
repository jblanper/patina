# Implementation Blueprint: Glossary Page (The Contextual Interlude)

**Date:** 2026-03-21
**Status:** Verification
**Reference:** `docs/curating-ui/proposal_glossary_page_2026-03-21.md`

---

## 1. Objective

Implement a bilingual (EN/ES) Coin Field Glossary accessible from the Cabinet toolbar and — in its second phase — as a contextual slide-in drawer triggered from individual field labels in the Scriptorium and CoinDetail views. The Glossary covers all ~25 fields of the `Coin` record across 6 sections, using the authoritative content already authored in `docs/glossary_coin_fields.md` and `docs/glossary_coin_fields_es.md`.

Delivery is in two sequential phases:

- **Phase 1a — The Manuscript Scroll:** A full-page `/glossary` route rendering the complete reference as a scrollable document with a sticky section rail and `#anchor` deep-links from field labels.
- **Phase 1b — The Contextual Drawer:** A `GlossaryDrawer` component that overlays the current view and targets a specific field, triggered by `?` icons on every field label in Scriptorium and CoinDetail. Phase 1a's scroll layout is reused as the drawer's body and as the full-page `/glossary` route.

### Philosophical Alignment

- [x] **Archival Ledger Aesthetic:** The Glossary renders as a typeset manuscript — Cormorant Garamond headings, JetBrains Mono for field names and type annotations, Montserrat for body. No decorative elements beyond the established palette.
- [x] **Privacy First:** All content is a static TypeScript constant bundled at build time. No external CDN, no network call, no runtime fetch.
- [x] **Single-Click Rule:** The Cabinet toolbar "Field Reference" link reaches the Glossary in one click. The `?` trigger on any field label opens the drawer in one click, at point of need.

---

## 2. Technical Strategy

### 2.1 Content Data Model

**New file:** `src/renderer/data/glossaryFields.ts`

All glossary content lives here as a typed TS constant — not in i18n JSON (content is long-form, rich with tables) and not parsed from Markdown at runtime (no additional dependency). The file is the single source of truth for both languages.

```typescript
export interface GlossaryField {
  id: string;        // matches Coin key: 'die_axis', 'metal', etc.
  nameKey: string;   // i18n key for the human-readable label, e.g. 'ledger.material'
  section: GlossarySection;
  required: boolean;
  typeKey: string;   // i18n key for the type annotation, e.g. 'glossary.types.text'
  description: { en: string; es: string };  // long-form content — stays bilingual in TS
  vocabulary?: { en: GlossaryVocabTable; es: GlossaryVocabTable };
  furtherReading?: { label: string; url: string }[];
}
```

**i18n key strategy (post-implementation revision):** The original design used hardcoded `{ en: string; es: string }` objects for `name` and `type`. After implementation, these were refactored to reference i18n keys:

- `nameKey` maps to existing `ledger.*` keys where available (e.g. `metal` → `ledger.material`, `title` → `ledger.designation`), and to new `glossary.fields.*` keys for fields without a ledger equivalent (e.g. `glossary.fields.mint`, `glossary.fields.rarity`, `glossary.fields.obverseLegend`).
- `typeKey` references new `glossary.types.*` keys (`glossary.types.text`, `glossary.types.decimal`, `glossary.types.decimalGrams`, etc.).
- `GLOSSARY_SECTIONS` likewise uses `labelKey: string` referencing `glossary.sections.*` keys.
- `description` and `vocabulary` remain as bilingual TS objects — these are long-form content (paragraphs, tables), not UI strings; moving them to flat JSON would be impractical.

**Spanish title field correction:** The `title` field was initially translated as "Denominación" (matching the `denomination` field), creating two identically-named fields in Spanish. Corrected to **"Designación"** — the direct cognate of "Designation", unambiguous and professionally appropriate.

**Denomination vocabulary expansion:** 16 Modern-era denominations added (Thaler, Escudo, Real de a Ocho, Guinea, Sovereign, Shilling, Eagle, Franc, Peso, Peseta, Mark, Krone/Krona, Lira, Rouble, Rupee, Maravedi), both in English and Spanish.

**No new Zod schema needed** — this is static display data, not user input.

---

### 2.2 Phase 1a — The Manuscript Scroll

#### New Files

| File | Role |
|---|---|
| `src/renderer/components/Glossary.tsx` | Full-page scroll component |
| `src/renderer/components/Glossary.test.tsx` | Collocated tests |

#### Modified Files

| File | Change |
|---|---|
| `src/renderer/App.tsx` | Add `<Route path="/glossary" element={<Glossary />} />` |
| `src/renderer/components/Cabinet.tsx` | Add "Field Reference" `<Link>` to toolbar |
| `src/renderer/components/LedgerForm.tsx` | Add `?` anchor links next to each field label |
| `src/renderer/components/CoinDetail.tsx` | Add `?` anchor links next to each field label |
| `src/renderer/i18n/locales/en.json` | Add `glossary` namespace keys |
| `src/renderer/i18n/locales/es.json` | Add `glossary` namespace keys (Spanish) |
| `src/renderer/styles/index.css` | Add ~60 lines of Glossary-specific styles |

#### `Glossary` Component Structure

```
<Glossary>
  <header class="app-header">
    <Link "← Back to Cabinet">           ← hairline nav link, top-left
    <h1> Field Reference </h1>
  </header>

  <div class="glossary-layout">
    <aside class="glossary-rail">        ← sticky section nav (scroll buttons)
      { GLOSSARY_SECTIONS.map(s =>
          <button onClick={scrollIntoView(s.id)}> initial </button>
      )}
    </aside>

    <main class="glossary-scroll">
      { GLOSSARY_SECTIONS.map(section =>
        <section id={section.id}>
          <h2> section.label </h2>
          { fieldsForSection.map(field =>
            <article id={field.id} class="glossary-entry">
              <header>
                <h3 class="glossary-field-name"> field.name[lang] </h3>
                <code class="glossary-field-id"> field.id </code>
                { field.required && <span class="glossary-required"> obligatorio </span> }
                <span class="glossary-type"> field.type[lang] </span>
              </header>
              <p> field.description[lang] </p>
              { field.vocabulary && <GlossaryTable table={field.vocabulary[lang]}> }
              { field.furtherReading && <ul class="glossary-further-reading"> }
            </article>
          )}
        </section>
      )}
    </main>
  </div>
</Glossary>
```

**Rail implementation note:** `<a href="#section_id">` anchors conflict with HashRouter (they overwrite the `#/glossary` route hash). The rail uses `<button onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}` instead.

`GlossaryTable` and `GlossaryEntry` are **exported** from `Glossary.tsx` for reuse by `GlossaryDrawer`.

Language selection: `const { i18n } = useTranslation()` → `lang = i18n.language as 'en' | 'es'` → select `field.name[lang]`, `field.description[lang]`, `field.vocabulary?.[lang]`.

#### Cabinet Toolbar Link Position

The "Field Reference" `<Link>` is placed **to the left of the "+ New Entry" CTA** in the toolbar, not after it.

#### `?` Links in LedgerForm (Phase 1a — Removed)

Phase 1a `?` link-triggers were removed after implementation. The `<Link to="/glossary#field_id">` approach caused a **HashRouter conflict**: clicking `?` clobbered the `#/glossary` route hash, rendering Cabinet instead of the Glossary. Because the navigation was one-way (no return to form state), the UX was worse than no trigger at all.

**Decision:** `?` triggers are deferred entirely to Phase 1b, where they are implemented as `<button>` elements that open the `GlossaryDrawer` overlay — no navigation, no loss of form state.

#### i18n Keys to Add

```json
// en.json additions
"glossary": {
  "title": "Field Reference",
  "backToCabinet": "← Back to Cabinet",
  "hintLabel": "Open glossary entry for {{field}}",
  "required": "required",
  "type": "Type"
}
```

#### CSS Additions (~60 lines)

```css
/* Glossary layout */
.glossary-layout { position: relative; }
.glossary-scroll { max-width: 780px; }

/* Sticky section rail */
.glossary-rail { position: sticky; top: 2rem; /* right-aligned */ }
.glossary-rail a { font: 0.7rem var(--font-mono); color: var(--text-muted); }
.glossary-rail a:hover { color: var(--accent-manuscript); }

/* Field entries */
.glossary-entry { margin-bottom: 2.5rem; padding-bottom: 2.5rem;
                  border-bottom: 1px solid var(--border-hairline); }
.glossary-field-name { font: 0.9rem var(--font-mono); color: var(--accent-manuscript); }
.glossary-required { font: 0.65rem var(--font-sans); color: var(--accent-manuscript);
                     text-transform: uppercase; letter-spacing: 0.08em; }
.glossary-type { font: 0.75rem var(--font-mono); color: var(--text-muted); }

/* Vocabulary tables */
.glossary-table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
.glossary-table th { font: 0.7rem var(--font-sans); text-transform: uppercase;
                      letter-spacing: 0.08em; color: var(--text-muted);
                      border-bottom: 1px solid var(--border-hairline); padding: 0.5rem; }
.glossary-table td { font: 0.85rem var(--font-sans); padding: 0.5rem;
                      border-bottom: 1px solid var(--border-hairline); }
.glossary-table tr:nth-child(even) td { background: var(--stone-pedestal); }

/* ? hint link */
.glossary-hint { font: 0.7rem var(--font-mono); color: var(--text-muted);
                  margin-left: 0.4rem; text-decoration: none; cursor: pointer; }
.glossary-hint:hover { color: var(--accent-manuscript); }
```

---

### 2.3 Phase 1b — The Contextual Drawer

#### New Files

| File | Role |
|---|---|
| `src/renderer/hooks/useGlossaryDrawer.ts` | Drawer state: open/close, active field |
| `src/renderer/hooks/useGlossaryDrawer.test.ts` | Hook unit tests |
| `src/renderer/hooks/useFocusTrap.ts` | Reusable focus trap utility |
| `src/renderer/hooks/useFocusTrap.test.ts` | Focus trap unit tests |
| `src/renderer/components/GlossaryDrawer.tsx` | Slide-in overlay component |
| `src/renderer/components/GlossaryDrawer.test.tsx` | Component tests |
| `src/renderer/contexts/GlossaryContext.tsx` | Context + provider for drawer state |

#### Further Reading Links — IPC Handler (Deferred)

The planned `open-external-url` IPC handler (`src/main/index.ts` + `preload.ts` + `ExternalUrlSchema`) was **not implemented in Phase 1b**. Further Reading links currently render as native `<a href target="_blank" rel="noreferrer">` elements. In Electron's sandboxed renderer this may rely on default link handling; a future phase should add the allowlist-validated `shell.openExternal` IPC handler per the Security Assessment in §5.

#### `useGlossaryDrawer` Hook

```typescript
interface GlossaryDrawerState {
  open: boolean;
  field: string | null;     // null = show full field index
}

interface UseGlossaryDrawer {
  drawerState: GlossaryDrawerState;
  openField: (fieldId: string) => void;
  openIndex: () => void;
  close: () => void;
}
```

State is local (`useState`) — no persistence, no IPC. The hook also registers the global `?` keyboard shortcut (`keydown` listener, mounted once at app level).

#### `GlossaryDrawer` Component

```
<GlossaryDrawer open={open} field={field} onClose={close}>

  [backdrop div — onClick: close]

  <aside role="dialog" aria-modal="true" aria-label="Field Reference"
         class="glossary-drawer">

    <header class="glossary-drawer-header">
      { field
          ? <> <button onClick={openIndex}>← All Fields</button>
               <code>{field}</code> </>
          : <span>Field Reference</span>
      }
      <button class="glossary-drawer-close" onClick={close}
              aria-label="Close field reference">×</button>
    </header>

    <div class="glossary-drawer-body" ref={bodyRef}>
      { field
          ? <GlossaryEntry field={matchedField} lang={lang} />
          : <GlossaryIndex onSelect={openField} lang={lang} />
      }
      { !field &&
          <Link to="/glossary" onClick={close} class="glossary-browse-all">
            Browse full reference ↗
          </Link>
      }
    </div>

  </aside>

</GlossaryDrawer>
```

#### Behaviours

| Behaviour | Implementation |
|---|---|
| Slide-in (enter) | Two-phase mount: `setMounted(true)` → double-`requestAnimationFrame` → `setVisible(true)`. First rAF commits the DOM at `translateX(100%)`; second rAF sets `data-open="true"` triggering the 0.25s ease transition. Double-rAF is required because a single rAF can be batched with the mount into one paint by the browser. |
| Slide-out (exit) | `setVisible(false)` starts the CSS `translateX(100%)` transition immediately. `setMounted(false)` fires after 250ms (matching transition duration) to unmount the DOM node. |
| Backdrop | `opacity: 0 → 1` transition (0.25s ease) via `data-visible` attribute. `pointer-events: none` when not visible. Background `rgba(45,41,38,0.35)` — lighter than confirmation modal (0.6) to keep context perceptible. |
| Esc close | `useEffect` → `keydown` listener active only while `open === true` |
| Backdrop click | `onMouseDown` on backdrop div calls `close()` |
| Scroll-lock | `document.body.style.overflow = 'hidden'` on open. Scrollbar width (`window.innerWidth − document.documentElement.clientWidth`) applied as `paddingRight` to prevent layout shift. Both restored on close. |
| Focus management | On open: `focus()` the close button. On close: focus returns to the triggering element via `triggerRef` stored in `useGlossaryDrawer` at the moment `openField` / `openIndex` is called. |
| Focus trap | Tab/Shift+Tab cycles within drawer's focusable elements only. `useFocusTrap(ref, visible)` — activated on `visible`, not `open`, to avoid trapping focus during the exit transition. |
| `?` keyboard shortcut | `keydown` listener on `document` for `key === '?'` (skipped when target is `INPUT` or `TEXTAREA`). Registered in `useGlossaryDrawer` via `useEffect`. Calls `openIndex()`. |

#### Field Label Triggers in LedgerForm (Phase 1b — Revised)

Phase 1b triggers are scoped to **Scriptorium only** (`LedgerForm`). CoinDetail drawer triggers may be added in a future phase.

**Initial design (circle `?` button, superseded):** A standalone `<button className="glossary-hint">?</button>` was placed inside the label span as a circle-enclosed superscript. This was replaced after user review.

**Revised design (dagger `†`, whole-label trigger):**

The entire label is the clickable target. The `†` dagger is a non-interactive `<span aria-hidden>` used as a visual footnote marker only. This eliminates the isolated `?` glyph that competed visually with the label text.

```tsx
// Each label — subtitle-label, metric-label, or section-label
<button
  className="subtitle-label"
  onClick={() => openField('era')}
  aria-label={t('glossary.hintLabel', { field: 'era' })}
>
  <span className="label-text">{t('ledger.era')}</span>
  <span className="glossary-hint" aria-hidden="true">†</span>
</button>
```

**Visual design decisions:**
- Symbol: `†` (typographic dagger) — carries scholarly footnote precedent, quieter than `?`
- Color: `var(--accent-manuscript)` (Burnt Sienna) at `opacity: 0.75` — matches the meta-line accent, visually subordinate at rest
- Position: `position: relative; top: -0.4em` — reliable superscript across all parent display modes (replaces `vertical-align: super` which failed on buttons inside flex containers)
- Hit area: `padding: 0.25em 0.3em` on the dagger span for visual breathing room
- Hover: dotted underline on `.label-text` only (via child selector, not the container) + dagger opacity to 1. Underline is scoped to the text `<span>` because `text-decoration` propagates to all inline children and cannot be cancelled on a sibling — targeting the child span is the only reliable cross-browser fix.

The `GlossaryDrawer` is mounted once in `App.tsx`, with `useGlossaryDrawer` state passed down via a context or prop-drilled to `Cabinet`, `Scriptorium`, and `CoinDetail`.

#### Mounting Strategy

`useGlossaryDrawer` is lifted to `App.tsx` and its state + actions are provided via a `GlossaryContext`. Components consume `useGlossaryContext()` to call `openField('fieldId')`. This avoids prop-drilling through the deep form hierarchy.

```typescript
// src/renderer/contexts/GlossaryContext.tsx
export const GlossaryContext = React.createContext<UseGlossaryDrawer | null>(null);
export const useGlossaryContext = () => {
  const ctx = useContext(GlossaryContext);
  if (!ctx) throw new Error('useGlossaryContext must be used within GlossaryProvider');
  return ctx;
};
```

`GlossaryDrawer` is rendered once as a sibling to `<Routes>` in `App.tsx`:

```tsx
<HashRouter>
  <div className="app-container">
    <GlossaryContext.Provider value={glossaryDrawer}>
      <Routes>…</Routes>
      <GlossaryDrawer
        open={glossaryDrawer.drawerState.open}
        field={glossaryDrawer.drawerState.field}
        onClose={glossaryDrawer.close}
        onOpenField={glossaryDrawer.openField}
      />
    </GlossaryContext.Provider>
  </div>
</HashRouter>
```

#### Additional CSS (~80 lines)

```css
/* Drawer chrome */
.glossary-drawer-backdrop { position: fixed; inset: 0;
  background: rgba(45, 41, 38, 0.35); z-index: 900; }

.glossary-drawer {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: min(600px, 90vw);
  background: var(--bg-manuscript);
  border-left: 1px solid var(--border-hairline);
  z-index: 901;
  display: flex; flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.25s ease;
}
.glossary-drawer[data-open="true"] { transform: translateX(0); }

.glossary-drawer-header {
  display: flex; align-items: center; gap: 1rem;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-hairline);
  flex-shrink: 0;
}
.glossary-drawer-close {
  margin-left: auto;
  font: 1.2rem var(--font-mono); color: var(--text-muted);
  background: none; border: none; cursor: pointer;
}
.glossary-drawer-close:hover { color: var(--accent-manuscript); }

.glossary-drawer-body {
  flex: 1; overflow-y: auto;
  padding: 2rem;
}

/* Index list (field-list mode) */
.glossary-index-section { margin-bottom: 1.5rem; }
.glossary-index-section h3 {
  font: 0.65rem var(--font-sans); text-transform: uppercase;
  letter-spacing: 0.1em; color: var(--text-muted);
  margin-bottom: 0.5rem;
}
.glossary-index-item {
  display: block; width: 100%; text-align: left;
  font: 0.85rem var(--font-mono); color: var(--text-ink);
  padding: 0.35rem 0;
  background: none; border: none; cursor: pointer;
  border-bottom: 1px solid transparent;
}
.glossary-index-item:hover { color: var(--accent-manuscript); }

.glossary-browse-all {
  display: block; margin-top: 2rem;
  font: 0.75rem var(--font-mono); color: var(--text-muted);
  text-decoration: none;
}
.glossary-browse-all:hover { color: var(--accent-manuscript); }
```

---

## 3. Verification Strategy

### Testing Plan

#### Phase 1a

**`src/renderer/components/Glossary.test.tsx`**
- Renders all 6 section headings in English
- Renders all 6 section headings in Spanish when `i18n.language = 'es'`
- All 25 field entries render with their `id` as HTML anchor
- "Back to Cabinet" link navigates to `/`
- Required fields show the required badge
- Vocabulary tables render when `vocabulary` is present
- Sticky section rail renders all 6 section initials as anchor links

#### Phase 1b

**`src/renderer/hooks/useGlossaryDrawer.test.ts`**
- Initial state: `{ open: false, field: null }`
- `openField('die_axis')` → `{ open: true, field: 'die_axis' }`
- `openIndex()` → `{ open: true, field: null }`
- `close()` → `{ open: false, field: null }`

**`src/renderer/components/GlossaryDrawer.test.tsx`**
- Does not render (`null`) when `open={false}` and `mounted` has never been set to true
- Renders field entry when `open={true}` and `field="die_axis"`
- Renders field index when `open={true}` and `field={null}`
- DOM node remains in document during the 250ms exit transition (two-phase mount: `mounted` stays `true` while `visible` goes `false`)
- DOM node is removed after the 250ms exit transition completes (`mounted` → `false`)
- Pressing Esc calls `onClose`
- Clicking backdrop calls `onClose`
- Close button calls `onClose`
- Focus moves to close button on open
- Focus returns to trigger element on close
- Body `overflow` is set to `hidden` while open; restored on close
- Body `paddingRight` is applied equal to scrollbar width while open; restored on close
- "Browse full reference ↗" link present in index mode
- `?` keyboard shortcut fires `openIndex` (integration test)

### Colocation Check

| Test File | Source File |
|---|---|
| `src/renderer/components/Glossary.test.tsx` | `src/renderer/components/Glossary.tsx` |
| `src/renderer/components/GlossaryDrawer.test.tsx` | `src/renderer/components/GlossaryDrawer.tsx` |
| `src/renderer/hooks/useGlossaryDrawer.test.ts` | `src/renderer/hooks/useGlossaryDrawer.ts` |
| `src/renderer/hooks/useFocusTrap.test.ts` | `src/renderer/hooks/useFocusTrap.ts` |

### Mocking Strategy

`window.electronAPI` is not called anywhere in this feature. No IPC mock setup required beyond the global mock already in `src/renderer/setupTests.ts`. Tests use `MemoryRouter` for routing.

For language switching tests: use `i18n.changeLanguage('es')` in `beforeEach` / restore in `afterEach`.

---

## 4. Architectural Oversight (`curating-blueprints`)
**Status:** Verified

### Audit Findings

- **System Integrity:** No Main process involvement. Content is a pure renderer-side TS constant. `GlossaryContext` is a standard React context — no leakage into the Electron bridge. `src/common/types.ts` is read-only referenced (field IDs mirror `Coin` keys) but not modified.
- **Abstraction:** Business logic (drawer state, focus trap, scroll-lock) is correctly encapsulated in `useGlossaryDrawer` and `GlossaryDrawer`. Components consume context without touching raw DOM scroll or focus APIs directly.
- **Cross-Process Consistency:** Not applicable — feature is renderer-only.
- **Type Safety:** `GlossaryField.id` is typed as `string`, not as `keyof Coin`. Consider narrowing to `keyof Coin` in Phase 1b to enforce compile-time alignment between field IDs in the data file and the actual `Coin` interface. This is a low-risk enhancement, not a blocker.

### Review Notes & Suggestions

- The `GlossaryContext` approach is the correct mounting strategy — avoid prop-drilling through `LedgerForm`'s deeply nested field label structure.
- The `useFocusTrap` utility should be a standalone hook in `src/renderer/hooks/` (not inlined in `GlossaryDrawer`) to keep it reusable for future modals.
- `data-open="true"` attribute on `.glossary-drawer` is used to drive the CSS transform. Verify that the attribute is toggled synchronously (not via `useState` delay) to ensure the transition triggers correctly on mount.
- Run `npx tsc --noEmit` after completing each phase before marking In-Progress → Verification.

---

## 5. Security Assessment (`securing-electron`)
**Status:** Verified

### Audit Findings

- **The Filter:** No user input is involved. Glossary content is a static TS constant — no runtime sanitization required. No Zod schema additions needed.
- **Protocols:** No `patina-img://` or `file://` usage. No image assets. No external URLs fetched at runtime. The static URLs in the "Further Reading" section of the markdown source are documentation-only and are not rendered as live links in the UI (they appear as plain text in the description string).
- **IPC Surface:** One new IPC handler: `open-external-url`. Added to `src/main/index.ts` and exposed on `window.electronAPI` via `preload.ts`. This is the only Main process change in the feature.
- **CSP:** No new inline scripts or dynamic `eval`. CSS transitions are declarative. No risk.
- **External Resources:** Glossary content is bundled at build time. The only outbound network action is user-initiated via the "Further Reading" links, routed through `shell.openExternal`.

### Review Notes & Suggestions

- **`open-external-url` must validate against an allowlist** before calling `shell.openExternal`. Raw renderer-supplied URLs must never be passed directly. The allowlist of permitted numismatic domains:
  ```typescript
  const ALLOWED_EXTERNAL_DOMAINS = [
    'numismatics.org',
    'ngccoin.com',
    'pcgs.com',
    'finds.org.uk',
    'forumancientcoins.com',
  ] as const;
  ```
  Validation via Zod in `src/common/validation.ts`:
  ```typescript
  export const ExternalUrlSchema = z.string().url().refine(
    (url) => ALLOWED_EXTERNAL_DOMAINS.some(d => new URL(url).hostname.endsWith(d)),
    { message: 'URL not in permitted domain allowlist' }
  );
  ```
  The IPC handler must call `ExternalUrlSchema.parse(url)` before `shell.openExternal`. Reject silently (log, do not throw to renderer).
- `preload.ts` exposes: `openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url)`.
- The `Further Reading` links in `GlossaryField` should be stored as `furtherReading?: { label: string; url: string }[]` on the field type — not as raw strings embedded in the `description` body.

---

## 6. Quality Assessment (`assuring-quality`)
**Status:** Verified

### Audit Findings

- **Coverage Check:**
  - `src/renderer/hooks/useGlossaryDrawer.ts` → target **90% function coverage** (matches hooks mandate). All 4 exported actions + state are covered by the test plan above.
  - `src/renderer/components/Glossary.tsx` → target **80% statement coverage** (matches components mandate). 7 test cases cover all branches (language toggle, required badge, vocabulary table presence/absence).
  - `src/renderer/components/GlossaryDrawer.tsx` → target **80% statement coverage**. 10 test cases cover all interactive states.
  - `src/renderer/data/glossaryFields.ts` → static data; no coverage requirement.
  - `src/renderer/contexts/GlossaryContext.tsx` → covered by component integration tests; `useGlossaryContext` error branch (used outside provider) is a one-liner test case.

- **Async Safety:** No async operations in this feature. All state transitions are synchronous. No `waitFor` or `findBy*` required — `getBy*` queries are safe throughout.

- **No new Electron API mock needed** beyond existing `setupTests.ts` global.

### Review Notes & Suggestions

- The `useFocusTrap` hook (Phase 1b) should have its own collocated test: `src/renderer/hooks/useFocusTrap.test.ts`. Test cases: focus cycles forward on Tab, cycles backward on Shift+Tab, handles empty focusable list gracefully.
- Snapshot tests are **not recommended** for `GlossaryDrawer` — the content is data-driven and snapshots would be brittle. Prefer `getByRole` / `getByText` assertions.
- Verify that `document.body.style.overflow` is correctly restored in the `useEffect` cleanup when the component unmounts while the drawer is open (edge case: navigating away mid-open).

---

## 7. UI Assessment (`curating-ui`)
**Status:** Verified

### Audit Findings

- **Aesthetic Compliance (Manuscript Hybrid v3.3):**
  - Typography hierarchy correct: Cormorant Garamond for section `<h2>`, JetBrains Mono for `.glossary-field-name` and type annotations, Montserrat for body descriptions.
  - Palette: all colours reference CSS variables — no hardcoded hex values in component JSX.
  - Drawer backdrop `rgba(45, 41, 38, 0.35)` is correctly lighter than the confirmation modal's `0.6` — the context behind remains perceptible, reinforcing "Contextual Interlude" intent.
  - Vocabulary tables use `--stone-pedestal` alternating rows and `--border-hairline` dividers — consistent with the existing ledger table pattern.
  - The `.glossary-hint` `?` button is visually subordinate at rest (`--text-muted`); it surfaces on deliberate hover (`--accent-manuscript`). This mirrors the "deferred disclosure" pattern used for `.btn-delete`.

- **Accessibility:**
  - Drawer: `role="dialog"`, `aria-modal="true"`, `aria-label` set.
  - Focus management on open/close is specified. Tab cycling via `useFocusTrap` is required.
  - `Esc` close is mandatory per WCAG 2.1 SC 2.1.2 (No Keyboard Trap).
  - Sticky section rail links are standard `<a href="#id">` anchors — no JS required, keyboard navigable natively.
  - `?` triggers have `aria-label` with field name for screen reader users.
  - Contrast: `--text-muted` (`#6A6764`) on `--bg-manuscript` (`#FCF9F2`) is 4.6:1 — passes AA for normal text.

- **The "Sanctuary" Rule:** The `.glossary-scroll` column is capped at `max-width: 780px` — it does not span the full viewport width, preserving breathing room. The sticky rail occupies the right margin without requiring additional padding.

- **Single-Click Rule compliance:** Cabinet toolbar → Glossary = 1 click. Any field `?` → drawer = 1 click. Drawer index → specific field = 2 clicks total from any screen. ✓

### Review Notes & Suggestions

- The `?` icon on `.subtitle-label` fields (era, mint, year, issuer, denomination, reference) requires careful visual audit — these labels use `display: contents` in the `.subtitle-stack` grid, which may break flex layout for the hint button. Consider wrapping the label + `?` in a `<span class="label-with-hint">` for those fields specifically.
- The drawer width `min(600px, 90vw)` on narrow viewports (< 667px) will cover nearly the full screen. On very small windows this degrades to a full-screen modal experience — acceptable for a desktop-only Electron app, but note the behaviour.
- Ensure the `?` button in CoinDetail's `.metric-label` (which uses `overflow: hidden; white-space: nowrap; text-overflow: ellipsis`) does not get clipped. The `?` should be positioned outside the ellipsis-overflow container, not inside it.

---

## 8. Numismatic & UX Assessment (`curating-coins`)
**Status:** Verified

### Audit Findings

- **Historical Accuracy:** The content source (`docs/glossary_coin_fields.md`) was authored to professional numismatic standards, covering RIC/Crawford/Cohen/Sear catalog references, the full adjectival and Sheldon grading scales, millesimal fineness notation, die axis clock-hour convention, and standard metal abbreviations (AV, AR, AE, BI, EL, OR, POT, PB). The `GLOSSARY_FIELDS` TS constant must faithfully reproduce this content without simplification.

- **Collector UX:** The point-of-need drawer (Phase 1b) is the highest-value pattern for a working numismatist — a collector entering `die_axis: 6h` on a Hadrian denarius can immediately verify the convention without leaving the Scriptorium form. This is a material improvement to the cataloging workflow.

- **Field ID alignment:** `GLOSSARY_FIELD.id` values must match the exact `Coin` interface keys (`die_axis`, `catalog_ref`, `year_numeric`, etc.) — not the i18n label keys (`dieAxis`, `reference`, `year`). The mapping between JS camelCase labels and snake_case DB keys must not be confused in the glossary data file.

- **Required fields:** Only `title` and `era` are marked `required: true`. All others are `false`. This matches the Zod schema in `src/common/validation.ts`.

### Review Notes & Suggestions

- The `rarity` field glossary entry must include both the **RIC scale** (C3–R5), the **Cohen scale** (C, R, RR, RRR, RRRR), and the **General/Modern scale** (Common → Unique). All three are present in the source glossary — ensure none are omitted in the TS data file.
- The `grade` entry is the longest in the glossary (two full grading scales: Adjectival and Sheldon 70-point). In the drawer's single-field view, consider rendering the two scales as labelled subsections (`<h4>`) rather than a single undifferentiated block. This is a rendering decision for Phase 1b implementation.
- The Spanish translation (`glossary_coin_fields_es.md`) preserves English abbreviations for all catalog codes (RIC, RPC, BMC, SNG, DOC), metal codes (AV, AR, AE), and grade codes (MS-65, EF-40, FDC). The `GLOSSARY_FIELDS` TS constant should do the same — these are internationally standardized identifiers, not translatable strings.

---

## 9. User Consultation & Decisions

### Open Questions

1. **Content data format:** Should `GLOSSARY_FIELDS` be a single bilingual TS file (one array, `en`/`es` keys per field) or two separate files (`glossaryFields_en.ts`, `glossaryFields_es.ts`) to keep each language's content easier to edit in isolation?

2. **Phase 1b mounting:** The `GlossaryContext` approach adds a new React context to the app. Is this acceptable, or is a simpler prop-drilling strategy preferred for the initial implementation (given that only 2 components — `LedgerForm` and `CoinDetail` — need the `openField` action)?

3. **`?` trigger scope:** Should CoinDetail field labels (read-only view) also receive `?` triggers in Phase 1b, or only Scriptorium (authoring view) where the collector is most likely to need field definitions?

4. **Further Reading links:** The glossary source includes URLs (`numismatics.org/ocre`, etc.). Should these be rendered as clickable links in the UI (opening via `shell.openExternal`) or as plain text in the description strings?

### Final Decisions

1. **Content data format:** Single bilingual file — `src/renderer/data/glossaryFields.ts` with `{ en, es }` keys per field. TypeScript's type system enforces completeness of both languages on every entry, preventing silent drift between translations.

2. **Phase 1b mounting:** `GlossaryContext` in `App.tsx`. Prop-drilling rejected — `LedgerForm` is deeply nested and the context pattern is already established in the project.

3. **`?` trigger scope:** Phase 1b triggers are **Scriptorium only** (`LedgerForm`). CoinDetail is a read-only view; collectors are most likely to need field definitions during authoring. CoinDetail can be added in a future phase if demand arises.

4. **Further Reading links:** Rendered as clickable `<a>` elements opening via `shell.openExternal` (Main process IPC). A new IPC handler `open-external-url` must be added to `src/main/index.ts` and exposed on `window.electronAPI` via `preload.ts`. The URL must be validated against an allowlist of known numismatic domains before `shell.openExternal` is called — required by "The Filter" principle even for outbound links.

---

## 10. Post-Implementation Retrospective

**Date:** 2026-03-21
**Outcome:** All Phase 1a and Phase 1b code is implemented. Pending: tests (§3), re-audits (§5/§6/§7/§8), and `open-external-url` IPC handler (deferred).

### Summary of Work

- **Phase 1a delivered:** Full-page `/glossary` route (`Glossary.tsx`), bilingual data constant (`glossaryFields.ts`, 25 entries, EN + ES), sticky section rail, Cabinet toolbar "Field Reference" link placed to the left of the "+ New Entry" CTA.
- **Phase 1b delivered:** `GlossaryDrawer` slide-in overlay, `useGlossaryDrawer` hook (state + `?` keyboard shortcut), `useFocusTrap` hook, `GlossaryContext` provider, field label triggers on all 19 labelled fields in `LedgerForm`.
- **Unplanned scope adjustments:**
  - Phase 1a `?` links (hash anchors → `/glossary`) were implemented then removed due to HashRouter conflict and no-return UX problem. Phase 1b drawer triggers were the correct solution.
  - `GlossaryField.name` bilingual key was added post-design-audit, then refactored to `nameKey` i18n key reference (see data model section).
  - Scrollbar-width compensation (`paddingRight`) was added to the scroll-lock effect to prevent layout shift on open.
  - `open-external-url` IPC handler deferred — Further Reading links use `<a target="_blank" rel="noreferrer">` for now.
- **Post-Phase-1b UX revisions (iterative polish):**
  - Circle `?` button replaced with typographic dagger `†` (`var(--accent-manuscript)`, superscript) — less visually prominent, carries scholarly footnote precedent.
  - `vertical-align: super` failed on buttons inside flex containers; replaced with `position: relative; top: -0.4em`.
  - Whole label converted to `<button>` — the entire label text + dagger is the click target. Dagger downgraded to `<span aria-hidden>` (non-interactive). Hover: dotted underline scoped to inner `.label-text` span to avoid CSS `text-decoration` inheritance propagating to the dagger.
  - Spanish `title` field translation corrected from "Denominación" → "Designación".
  - 16 Modern-era denominations added to the `denomination` vocabulary table (EN + ES).
  - `glossaryFields.ts` i18n refactor: `name`/`type` bilingual objects → `nameKey`/`typeKey` i18n key references; `GLOSSARY_SECTIONS` label → `labelKey`. Components updated to use `t(field.nameKey)` etc.
  - `CoinDetail` footer layout fixed: `display: flex; justify-content: space-between` on `.ledger-footer` to align ADQUIRIDA and COSTE on the same row.
  - `plate-caption` top margin added (`margin-top: 0.75rem`) to separate the caption from the dashed frame border.

### Pain Points

- **HashRouter vs. hash anchors:** `<a href="#section_id">` in the sticky rail overwrites the `#/glossary` route hash, rendering Cabinet instead of the Glossary. Took one full round-trip (implement → observe → fix) to catch. Any future feature using hash-based in-page navigation must account for this at design time.
- **Double-rAF animation pattern:** A single `requestAnimationFrame` was insufficient — the browser batched `setMounted(true)` and `setVisible(true)` into the same paint, so the CSS transition never fired from the initial off-screen position. The double-rAF requirement is non-obvious and was discovered only after the first animation attempt failed. Documented in §2.3 Behaviours table for future reference.
- **TypeScript `RefObject<HTMLElement>` vs. `RefObject<HTMLElement | null>`:** React 18 + TypeScript strict mode returns `RefObject<T | null>` from `useRef<T>(null)`. The `useFocusTrap` parameter type had to be widened from `RefObject<HTMLElement>` to `RefObject<HTMLElement | null>` to satisfy the type checker without casting.
- **Curly/smart quotes in TS string literals:** A stray curly quote (`"`) inside a double-quoted TypeScript string in `glossaryFields.ts` caused a parse error. Replaced with escaped Unicode (`\u2014`) + structural single/double quote nesting.
- **`text-decoration` CSS inheritance:** `text-decoration` on a parent propagates to all inline children and cannot be cancelled on a child with `text-decoration: none` (despite the spec allowing it, Electron's Chromium did not honour it). Workaround: apply the underline only to a `.label-text` child `<span>` — sibling spans are unaffected.
- **`vertical-align: super` on flex-context buttons:** Buttons inside a flex or grid parent do not honour `vertical-align: super` for raising child elements. Replaced with `position: relative; top: -0.4em` which works regardless of parent display mode.

### Things to Consider

- **Tests:** `Glossary.test.tsx`, `GlossaryDrawer.test.tsx`, `useGlossaryDrawer.test.ts`, `useFocusTrap.test.ts` are all pending. This is the primary blocker for advancing from Verification → Completed.
- **`open-external-url` IPC handler:** Deferred to a future phase. Further Reading links use `<a target="_blank">` which may not open reliably in Electron sandbox. The allowlist-validated handler (§5) should be prioritised before the feature is considered fully production-ready.
- **CoinDetail `?` triggers:** Deferred. Scriptorium-only for Phase 1b. If collectors request point-of-need glossary access in read-only views, add in a follow-up.
- **`GlossaryField.id` type narrowing:** Could be tightened to `keyof Coin` at compile time (currently `string`). Low-risk enhancement — not a correctness issue since 25 entries were manually verified against `src/common/types.ts`.
- **i18n single source of truth:** The `nameKey`/`typeKey` refactor means field name translations are now maintained exclusively in `en.json`/`es.json`. Adding a new glossary field requires: (1) adding the `nameKey` to `ledger.*` or `glossary.fields.*` in both JSON files, (2) adding a `typeKey` to `glossary.types.*` if a new type is needed, (3) adding the entry to `GLOSSARY_FIELDS`. No bilingual duplication.
- **Core Doc Revision:** `AGENTS.md`, `style_guide.md`, and `style_guide.html` were not updated. If the double-rAF animation pattern, two-phase mount idiom, or GlossaryContext context pattern are to be codified as project standards, they should be added in the post-completion standardisation step.
