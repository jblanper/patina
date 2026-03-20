# Patina — Comprehensive Code Review & UX/UI Audit

**Date:** 2026-03-20
**Reviewer:** Claude Code (claude-sonnet-4-6)
**Scope:** Full codebase audit — code quality, architecture, security, performance, error handling, testing, dependencies, documentation, and UX/UI.

---

## Executive Summary

**Overall Health Score: 7.2 / 10**

Patina is a thoughtfully constructed Electron application with a clear architectural vision and strong foundational decisions: strict TypeScript, Zod validation at every boundary, custom IPC bridge, no external telemetry, and a coherent design language. The "Manuscript Hybrid" aesthetic is consistently applied throughout, and the security posture exceeds what most Electron apps ship with.

However, several issues undermine an otherwise strong codebase. The most critical are: **foreign key enforcement is disabled** in SQLite (cascade deletes are silently not working), **synchronous file reads** block the Electron main thread on every image load, an **SVG upload attack surface** in the Lens server, a **duplicate IPC listener bug** that can cause missed image uploads, and **major UI omissions** — including a missing Era selector, no delete functionality, and inaccessible filter controls.

| Category | Score | Assessment |
|---|---|---|
| Architecture & Design | 9/10 | Clean, principled separation; The Filter works well |
| Security | 7/10 | Strong foundations; gaps in MIME allowlist and main thread safety |
| Code Quality | 7/10 | Strict TS enforced; `any` violations and dead code present |
| Performance | 6/10 | Blocking main process reads; N+1 queries in export |
| Error Handling | 6/10 | Boundary exists; form failures are silent |
| Testing | 5/10 | Hooks tested; components and validation mostly untested |
| UX/UI | 6/10 | Distinctive aesthetic; accessibility and feature gaps hurt usability |
| Dependencies | 8/10 | Modern, well-chosen; no obvious vulnerabilities found |
| Documentation | 8/10 | CLAUDE.md and AGENTS.md are excellent references |

---

## Findings by Category

### 🔴 Critical / High Severity

---

#### [SEC-01] 🔴 SQLite Foreign Keys Disabled — Cascade Deletes Not Working

**File:** `src/main/db.ts:24`

```typescript
db.pragma('journal_mode = WAL');
// Missing: db.pragma('foreign_keys = ON');
```

SQLite does **not enforce foreign key constraints by default**. The `ON DELETE CASCADE` defined in `src/common/schema.ts:57` for `images.coin_id → coins.id` is **silently ignored**. Deleting a coin via `dbService.deleteCoin()` does not cascade-delete its images, leaving orphaned image records in the database indefinitely. Image files are never deleted from disk either.

**Recommendation:** Add immediately after `journal_mode = WAL`:
```typescript
db.pragma('foreign_keys = ON');
```
Then also implement physical file cleanup in `deleteCoin` for the orphaned files.

---

#### [SEC-02] 🔴 Lens Server — MIME Type Allowlist Too Broad (SVG Attack Surface)

**File:** `src/main/server.ts:71-77`

```typescript
fileFilter: (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {  // ← Too broad
    cb(null, true);
  }
```

`image/svg+xml` matches this check. SVG files can contain embedded `<script>` tags and JavaScript. While Electron's sandbox limits the blast radius, a malicious SVG uploaded via the Lens bridge could execute in the renderer if served back through `patina-img://` (which has `bypassCSP: true`). The extension check in `filename` only fires after the filter passes, and a `cb(new Error(...))` in `filename` may still have already accepted the file.

**Recommendation:** Replace with an explicit allowlist:
```typescript
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
if (ALLOWED_MIMES.has(file.mimetype)) { cb(null, true); }
else { cb(new Error('Only JPEG, PNG, and WebP are accepted.')); }
```

---

#### [PERF-01] 🔴 Synchronous File Read Blocks Main Process on Every Image

**File:** `src/main/index.ts:97`

```typescript
const fileBuffer = fs.readFileSync(fullPath);  // ← Blocks the event loop
```

`fs.readFileSync` is called inside the `patina-img://` protocol handler, which runs on the Electron main process. Every image render in the gallery, detail view, and plate editor triggers this. For large images or many simultaneous requests, this **freezes the entire main process** (blocking IPC, window events, everything) until the read completes.

**Recommendation:** Use async streaming:
```typescript
const stream = fs.createReadStream(fullPath);
return new Response(stream, { headers: { 'Content-Type': `image/${mimeType}` } });
```
Or use `fs.promises.readFile` with an async handler.

---

#### [BUG-01] 🔴 Duplicate IPC Listener Registration — Images Can Be Lost

**File:** `src/renderer/hooks/useLens.ts:37` and `src/renderer/components/PlateEditor.tsx:26`

Both `useLens` and `PlateEditor` independently call `window.electronAPI.onLensImageReceived(callback)`. Since `ipcRenderer.on` does **not** replace existing listeners, two callbacks are registered for the same `lens:image-received` event. The `useLens` listener sets `lastImage` state (which is returned by the hook but not used by `PlateEditor`). The `PlateEditor` listener calls `onImageCaptured`. However, because both register independently, calling `removeLensListeners` in one component removes **all** listeners, potentially clearing the other component's registration in unexpected cleanup timing.

More critically, the `useLens` useEffect registers a listener on mount that is never refreshed, while `PlateEditor`'s useEffect re-registers every time `activeSlot` changes (re-registering on top of the existing one without first removing the prior one). This can lead to multiple `onImageCaptured` calls for a single upload.

**Recommendation:** Centralize IPC listener registration exclusively in `useLens`. Expose a callback prop (`onImageReceived`) that callers supply to the hook, removing the need for `PlateEditor` to register its own listener.

---

#### [UX-01] 🔴 Era Field Cannot Be Changed — All New Coins Default to "Ancient"

**File:** `src/renderer/components/LedgerForm.tsx` (no era input present)
**File:** `src/renderer/hooks/useCoinForm.ts:13-17`

```typescript
const DEFAULT_STATE: CoinFormState = {
  title: '',
  era: 'Ancient',  // ← Fixed default; no UI to change it
  images: {}
};
```

The `era` field is required and typed `'Ancient' | 'Medieval' | 'Modern'` in the schema, but **`LedgerForm.tsx` contains no input or selector for it**. Every coin created via the UI will have `era: 'Ancient'` regardless of the actual coin's era. The meta-line displays the era, but it is always "ANCIENT". The sidebar filter for Eras is therefore only useful for seeded data.

**Recommendation:** Add a `<select>` or segmented button for era in `LedgerForm.tsx` between the title and the metric fields.

---

### 🟡 Medium Severity

---

#### [SEC-03] 🟡 `bypassCSP: true` on Custom Protocol Is Overly Permissive

**File:** `src/main/index.ts:23`

```typescript
{ scheme: 'patina-img', privileges: { secure: true, supportFetchAPI: true, standard: true, bypassCSP: true } }
```

`bypassCSP: true` means resources served via `patina-img://` will not be subject to the app's Content Security Policy. This broadens the attack surface. If an SVG with embedded scripts were served (see SEC-02), CSP would offer no protection.

**Recommendation:** Remove `bypassCSP: true`. If CSP is blocking image loads, adjust the CSP header to include `img-src patina-img:` instead.

---

#### [SEC-04] 🟡 `server: any` Type in Lens Server Violates Strict TypeScript

**File:** `src/main/server.ts:23`

```typescript
let server: any = null;
```

Violates the "no `any`" mandate. The correct type is `import('http').Server | null`.

---

#### [BUG-02] 🟡 `existingImagePaths` Stale Set — Edit Mode Duplication Risk

**File:** `src/renderer/hooks/useCoinForm.ts:43-45`

```typescript
const [existingImagePaths] = useState<Set<string>>(
  () => new Set(existingImages.map(img => img.path))
);
```

`existingImagePaths` is initialized once via the lazy state initializer from `existingImages`. If `existingImages` changes after the first render (e.g., if the coin loads asynchronously), the set is **never updated**. In edit mode where `existingImages` arrives via async `useCoin`, the initial render will see `existingImages = []`, creating an empty set. Subsequent submission would then attempt to re-add all existing images, relying on the database's `INSERT OR IGNORE` to silently deduplicate. This works by accident but is fragile.

**Recommendation:** Replace with `useMemo`: `const existingImagePaths = useMemo(() => new Set(existingImages.map(img => img.path)), [existingImages]);`

---

#### [BUG-03] 🟡 Form Submission Failure Is Silent — No User Feedback

**File:** `src/renderer/hooks/useCoinForm.ts:142-144`

```typescript
} catch (err) {
  console.error('Submission failed:', err);
  return false;  // ← No error state set
}
```

When `submit()` fails (e.g., IPC error, network loss), it returns `false` and logs to the console, but sets **no error state**. The `Scriptorium` component receives `false` from `await submit()` and simply stays on the page. The user sees no error message explaining what went wrong.

**Recommendation:** Add an `submitError: string | null` state to the hook and set it on failure. Render it prominently in `Scriptorium.tsx`.

---

#### [PERF-02] 🟡 N+1 Database Queries in ZIP Export

**File:** `src/main/export/zip.ts:67-86` and `113-121`

The export function fetches all coins once (`dbService.getCoins()`), then calls `dbService.getImagesByCoinId(coin.id)` for each coin in a loop — once to build the `imagesMap` and again when `includeImages` is true. For a collection of 500 coins, this executes **1001 separate DB queries** instead of 2 (one for coins, one for all images with a `WHERE coin_id IN (...)` or a JOIN).

**Recommendation:** Replace the per-coin image fetch with a single query: `SELECT * FROM images WHERE coin_id IN (...)` or use a JOIN. Cache results in the first pass to avoid the second loop.

---

#### [CODE-01] 🟡 `any` Types Violate Strict TypeScript Mandate

**Files:**
- `src/renderer/components/Scriptorium.tsx:26`: `const imageMap: any = {}`
- `src/renderer/hooks/useCoinForm.ts:69`: `updateField = useCallback((field: keyof NewCoin, value: any)`
- `src/renderer/components/LedgerForm.tsx:7`: `updateField: (field: keyof NewCoin, value: any) => void`
- `src/main/server.ts:23`: `let server: any = null`

The project's `strict: true` config and AGENTS.md mandate "No `any` — use `unknown` with type guards." These four instances directly contradict that rule.

**Recommendation:**
- `imageMap`: type as `Partial<Record<'obverse' | 'reverse' | 'edge', string>>`
- `updateField value`: use a union type or `string | number | null | boolean`
- `server`: use `import('http').Server | null`

---

#### [CODE-02] 🟡 Dead Code — Unused Filter Fields and Hook Exports

**File:** `src/common/validation.ts:62-71` — `FilterStateSchema` includes `mint`, `rarity`, `grade` fields.
**File:** `src/renderer/hooks/useCoins.ts:46-94` — `filteredCoins` logic ignores `mint`, `rarity`, `grade`.
**File:** `src/renderer/components/PatinaSidebar.tsx` — Only Era and Metal filters are rendered.

The `mint`, `rarity`, and `grade` filter fields in `FilterStateSchema` are never applied in the filtering logic and never exposed in the UI. Similarly, `useCoins` returns `addCoin`, `updateCoin`, `deleteCoin`, `refresh` — none of which are consumed by any component (components use the coin form hooks directly).

**Recommendation:** Either implement the missing filter functionality or remove the unused fields to reduce schema complexity. Remove unused return values from `useCoins` or document the intended future use.

---

#### [UX-02] 🟡 Filter List Items Are Not Keyboard Accessible

**File:** `src/renderer/components/PatinaSidebar.tsx:43-52`

```tsx
<li
  className={`filter-item ${isSelected('era', era) ? 'active' : ''}`}
  onClick={() => toggleFilter('era', era)}
>
  {era}
</li>
```

`<li>` elements with `onClick` but no `role`, `tabIndex`, or `onKeyDown` are not reachable by keyboard users. Pressing Tab will skip all filter items. Pressing Enter/Space on a focused item does nothing.

**Recommendation:** Replace with `<button>` elements styled via CSS, or add `role="checkbox"`, `tabIndex={0}`, and `onKeyDown={(e) => e.key === 'Enter' && toggleFilter(...)}`. WCAG 2.1 SC 2.1.1 (Keyboard) requires all functionality to be accessible via keyboard.

---

#### [UX-03] 🟡 Modal Dialogs Lack Accessibility Requirements

**Files:**
- `src/renderer/components/PlateEditor.tsx:96-103` (QR overlay)
- `src/renderer/components/CoinDetail.tsx:209-220` (zoom modal)

Both modal overlays are missing:
- `role="dialog"` on the container
- `aria-modal="true"`
- `aria-labelledby` pointing to a title element
- Focus trapping (Tab should cycle within the modal)
- `aria-label` on the close button (the `×` character is not descriptive)

**Recommendation:** Use a focus trap library or implement manually. At minimum add `role="dialog"`, `aria-modal="true"`, and `aria-label="Close"` on the `×` button.

---

#### [UX-04] 🟡 "Import from Digital Archive" Button Is a Dead Stub

**File:** `src/renderer/components/PlateEditor.tsx:84`

```tsx
<button className="btn-lens-minimal">Import from Digital Archive</button>
```

This button has no `onClick` handler and no `disabled` state. Clicking it does nothing but appears interactive. This violates the principle of least surprise and could confuse users.

**Recommendation:** Either implement the feature, add `disabled` with a `title="Coming soon"`, or remove the button entirely until the feature is ready.

---

#### [UX-05] 🟡 No Delete Coin Functionality in the UI

**File:** `src/renderer/components/CoinDetail.tsx` (no delete button)

`dbService.deleteCoin` and `window.electronAPI.deleteCoin` are fully implemented. The IPC bridge exposes `deleteCoin`. However, there is no button in `CoinDetail.tsx` that allows the user to delete a coin. This is a functional gap — users who want to remove an entry from their collection have no way to do so within the app.

**Recommendation:** Add a "Delete Record" button (with confirmation dialog) to the `CoinDetail` header.

---

#### [UX-06] 🟡 Missing Form Fields — `issuer`, `denomination`, `rarity`, `year_numeric`

**File:** `src/renderer/components/LedgerForm.tsx`

The `Coin` type and database schema include `issuer`, `denomination`, `year_numeric`, and `rarity`. None of these fields appear in `LedgerForm.tsx`. Coins collected via the UI will always have these fields as `null`/`undefined`, reducing the quality of catalog data.

**Recommendation:** Add inputs for at minimum `issuer` and `denomination` (both commonly required for numismatic identification). `year_numeric` can be auto-derived from `year_display` parsing or be a separate numeric input.

---

#### [WCAG-01] 🟡 Color Contrast Failures on Muted Text

**File:** `src/renderer/styles/index.css:8, 84, 342`

- `--text-muted: #7A7875` on `--bg-manuscript: #FCF9F2` yields a contrast ratio of approximately **3.99:1**, below the WCAG AA threshold of 4.5:1 for normal text. Used on `.cabinet-subtitle`, filter labels, `.coin-ref`, and more.
- `.cabinet-status` (line 342) uses `font-size: 0.6rem` — text this small is a WCAG failure at essentially any color at this scale.
- The `metric-divider` (`//`) uses `--border-hairline: #E0DCCD` — contrast ratio against parchment is approximately **1.4:1**, well below the minimum.

**Recommendation:** Darken `--text-muted` to at least `#6A6764` to reach 4.5:1 contrast. Remove the 0.6rem font size (minimum readable is 0.75rem). The decorative dividers can stay low-contrast as non-text decorative elements (WCAG exempts purely decorative content).

---

#### [CODE-03] 🟡 Inline Styles Violate "Vanilla CSS Only" Mandate

**Files:**
- `src/renderer/components/ErrorBoundary.tsx:12-78` — entire component uses inline `style={{}}` objects
- `src/renderer/components/LedgerForm.tsx:174`: `style={{ height: '180px' }}`
- `src/renderer/components/LedgerForm.tsx:183`: `style={{ width: '100%', color: 'var(--text-ink)' }}`
- `src/renderer/components/CoinDetail.tsx:201`: `style={{ opacity: 0.5 }}`

CLAUDE.md mandates "All CSS lives in `src/renderer/styles/index.css` — vanilla CSS only, no CSS-in-JS." These inline styles contradict this.

**Recommendation:** Move all styles to CSS classes in `index.css`. ErrorBoundary is the most egregious — add CSS classes `.error-boundary`, `.error-boundary__title`, etc.

---

#### [CODE-04] 🟡 Hardcoded Color in CSS (Missing CSS Variable)

**File:** `src/renderer/styles/index.css:372`

```css
.coin-card:hover, .coin-card:focus-visible {
  background: #F4F1E9;  /* ← Not a CSS variable */
}
```

This color `#F4F1E9` is close to `--stone-pedestal: #F0EDE6` but is not the same value and is not defined as a variable. When the palette is updated, this value would be missed.

**Recommendation:** Either use `--stone-pedestal` or define a new `--stone-pedestal-hover` variable.

---

#### [SCHEMA-01] 🟡 Schema-DB Constraint Duplication

**File:** `src/common/schema.ts:57` and `src/main/db.ts:31`

The `UNIQUE(coin_id, path)` constraint is declared twice: as a table constraint in `schema.ts`'s `extraSQL` (enforced on `CREATE TABLE IF NOT EXISTS`) and as a migration index `idx_images_coin_path` in `db.ts:31`. This is redundant — SQLite creates a unique index implicitly for table constraints. Both serve the same purpose with different names.

**Recommendation:** Remove the `UNIQUE(coin_id, path)` from `extraSQL` in `schema.ts` and keep only the explicit named index in `db.ts`. This makes the unique constraint visible in queries via `PRAGMA index_list('images')`.

---

### 🟢 Low Severity / Informational

---

#### [CODE-05] 🟢 `CoinCard` Has Stale Comment About Protocol

**File:** `src/renderer/components/CoinCard.tsx:32-34`

```typescript
// Safe image path handling (using relative paths from data/images)
// In a real Electron app, you might use a custom protocol like patina://
// For now, we'll assume the renderer can resolve them if the base path is handled.
```

This comment is outdated — the `patina-img://` protocol is fully implemented and in use. The comment suggests the protocol is hypothetical.

**Recommendation:** Remove or update the comment to reflect the actual implementation.

---

#### [CODE-06] 🟢 `package.json` Missing Author and Description

**File:** `package.json:6,8`

```json
"description": "",
"author": "",
```

These are empty. For a packaged Electron app (`electron-builder`), both fields appear in the application's metadata, About dialog, and OS-level attribution.

---

#### [PERF-03] 🟢 No Virtualization in GalleryGrid for Large Collections

**File:** `src/renderer/components/GalleryGrid.tsx:50-61`

All coin cards are rendered simultaneously. For a collection with 500+ coins, this could degrade scroll performance. `React.memo` on `GalleryGrid` and `CoinCard` helps prevent unnecessary re-renders but does not reduce the DOM node count.

**Recommendation:** For now, this is acceptable given the expected collection sizes. If performance degrades, consider `@tanstack/react-virtual` for windowed rendering. A low-priority improvement.

---

#### [UX-07] 🟢 `CoinCard` Missing Keyboard Activation Handler

**File:** `src/renderer/components/CoinCard.tsx:38-42`

```tsx
<article
  className="coin-card"
  onClick={() => onClick?.(coin.id)}
  tabIndex={0}
  aria-label={`Coin card for ${coin.title}`}
>
```

`tabIndex={0}` makes the card focusable, but there is no `onKeyDown` handler for Enter/Space activation. Screen reader users and keyboard-only users cannot activate coin cards.

**Recommendation:** Add `onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(coin.id); }}`.

---

#### [UX-08] 🟢 Zoom Modal Close Button Has Poor Accessibility Label

**File:** `src/renderer/components/CoinDetail.tsx:212`

```tsx
<button className="zoom-close" onClick={() => setIsZoomOpen(false)}>×</button>
```

The `×` character renders visually but is meaningless to screen readers. `aria-label="Close image"` is needed.

---

#### [UX-09] 🟢 Purchase Price Is Hidden But Still Stored

**File:** `src/renderer/components/CoinDetail.tsx:197-204`

```tsx
{coin.purchase_price && (
  <div className="footer-item cost-item">
    <strong>Cost:</strong>
    <span style={{ opacity: 0.5 }}>HIDDEN</span>
  </div>
)}
```

The purchase price is stored in the database and exported to CSV/PDF, but rendered as "HIDDEN" in the UI with reduced opacity. This design decision is unexplained — if the intent is privacy, the field should be omitted from the CSV/PDF export or toggled via a setting. As-is, it provides false assurance of privacy.

**Recommendation:** Either render the price (it's a local, private app), or add an explicit "show sensitive data" toggle in settings. Do not silently export values the UI hides.

---

#### [ERR-01] 🟢 ErrorBoundary Recovery Reloads the Entire Page

**File:** `src/renderer/components/ErrorBoundary.tsx:87-89`

```typescript
onReset={() => {
  window.location.reload();
}
```

Full page reload is the nuclear option. For an error in a single component tree, calling `location.reload()` destroys all app state including unsaved drafts in localStorage that haven't been persisted yet (within the 2s debounce window).

**Recommendation:** For the gallery view, allow the `resetErrorBoundary()` callback from `react-error-boundary` to re-mount only the failed subtree. Reserve `location.reload()` as a last resort with a warning to the user that unsaved work may be lost.

---

#### [TEST-01] 🟢 Critical Components Lack Test Coverage

Component test files are missing for:
- `Cabinet.tsx` (main app view)
- `Scriptorium.tsx` (add/edit form — the most complex component)
- `PlateEditor.tsx` (handles IPC listeners directly)
- `PatinaSidebar.tsx`
- `GalleryGrid.tsx`
- `SearchBar.tsx`
- `ExportToast.tsx`

Additionally, `src/common/validation.ts` has a mandate for 100% branch coverage but has no dedicated test file visible in the repository.

**Recommendation:** Add tests for at minimum `Scriptorium`, `PlateEditor`, and `validation.ts`. The Scriptorium form is the most critical user flow.

---

#### [TEST-02] 🟢 No Test for `useLens` Hook

**File:** `src/renderer/hooks/useLens.ts` — no corresponding test file found.

`useLens` manages server lifecycle and IPC listener registration. The duplicate listener issue (BUG-01) would have been caught by a test.

---

#### [DOC-01] 🟢 `schema.ts` — `era` Default Mismatches Validation Default

**File:** `src/common/schema.ts:23` and `src/renderer/hooks/useCoinForm.ts:15`

The database schema declares `era` with `DEFAULT 'Modern'` (schema.ts:23), but the form default state sets `era: 'Ancient'` (useCoinForm.ts:15). These two defaults disagree. Seeded data could have `era = 'Modern'` for rows inserted without an explicit value, while form-created coins have `era = 'Ancient'`.

**Recommendation:** Align both defaults. Choose `'Ancient'` (most common for numismatic collectors) or `'Modern'` and update both locations.

---

## Top 10 Priority Issues

| # | Issue | Severity | Category | File |
|---|---|---|---|---|
| 1 | **Foreign keys not enforced** — cascade deletes silently fail | 🔴 | Bug/Data Integrity | `src/main/db.ts:24` |
| 2 | **Synchronous `readFileSync`** blocks main process on every image | 🔴 | Performance | `src/main/index.ts:97` |
| 3 | **SVG MIME allowlist** — `image/svg+xml` accepted; script execution risk | 🔴 | Security | `src/main/server.ts:72` |
| 4 | **Era field missing from form** — all coins permanently set to "Ancient" | 🔴 | UX / Data | `src/renderer/components/LedgerForm.tsx` |
| 5 | **Duplicate IPC listener** — multiple registrations; potential missed uploads | 🔴 | Bug | `useLens.ts:37`, `PlateEditor.tsx:26` |
| 6 | **No delete coin UI** — implemented in backend, absent from interface | 🟡 | UX / Feature | `src/renderer/components/CoinDetail.tsx` |
| 7 | **Form submission silently fails** — no error message shown to user | 🟡 | Error Handling | `src/renderer/hooks/useCoinForm.ts:142` |
| 8 | **Filter `<li>` items not keyboard accessible** — WCAG SC 2.1.1 | 🟡 | Accessibility | `src/renderer/components/PatinaSidebar.tsx:43` |
| 9 | **`bypassCSP: true` on image protocol** — removes CSP protection layer | 🟡 | Security | `src/main/index.ts:23` |
| 10 | **`--text-muted` contrast ratio ~3.99:1** — fails WCAG AA 4.5:1 | 🟡 | Accessibility | `src/renderer/styles/index.css:8` |

---

## Positive Highlights

The following aspects of the codebase represent genuinely well-executed work:

1. **"The Filter" architecture is correctly implemented.** Zod `.strict()` schemas in the main process, proper context isolation, no raw IPC exposure — this is Electron security done right. The `bypassCSP` issue aside, the overall security architecture is exemplary for a desktop app.

2. **Custom `patina-img://` protocol.** Using a registered custom protocol instead of `file://` preserves the renderer sandbox and CSP correctly. The path traversal guard (`startsWith(imageRoot)` check at `index.ts:91`) is sound.

3. **Debounce + memoization pattern in `useCoins`.** The combination of `useDebounce(300ms)` for search, `useMemo` for filter/sort logic, and `React.memo` on `GalleryGrid` and `CoinCard` demonstrates thoughtful performance design.

4. **Auto-draft in `useCoinForm`.** The 2-second debounced `localStorage` persistence for the Scriptorium form prevents data loss on unexpected close. The draft is correctly skipped in edit mode.

5. **CSV formula injection protection.** `exportCsvField()` in `validation.ts:102-109` correctly prefixes formula characters (`=`, `+`, `-`, `@`, `\t`, `\r`) with an apostrophe. This protects users who open exports in spreadsheet applications.

6. **`useCoin` mount guard.** The `isMounted` flag pattern in `useCoin.ts:18-72` correctly prevents state updates on unmounted components, avoiding the "Can't perform a React state update on an unmounted component" warning.

7. **Express rate limiting.** The Lens server applies `express-rate-limit` (100 req/15min) before any route handling. This is a simple but effective defense against local network abuse.

8. **Consistent design language.** The Manuscript Hybrid palette, CSS variable system, and typographic hierarchy (`Cormorant Garamond / Montserrat / JetBrains Mono`) are applied consistently throughout the renderer, the Lens mobile UI, and the exported PDF. This cohesion is rare and commendable.

9. **`CLAUDE.md` is a first-class engineering artifact.** The architecture documentation, security mandates, command reference, and style rules in `CLAUDE.md` are comprehensive and would allow a new developer to become productive within a day.

10. **WAL mode and UUID token.** WAL journal mode for concurrent reads and a per-session UUID token for the Lens server are both correct choices that show awareness of SQLite and local network security constraints respectively.

---

## Recommended Next Steps

### Immediate (Critical Fixes)

1. **Add `db.pragma('foreign_keys = ON')` in `db.ts`.** Two lines of code that fix data integrity for all existing and future users.

2. **Fix MIME allowlist in Lens server.** Replace `mimetype.startsWith('image/')` with an explicit `Set` of `['image/jpeg', 'image/png', 'image/webp']`.

3. **Fix synchronous image reads.** Switch `protocol.handle('patina-img', ...)` to use streaming or `fs.promises.readFile`.

### Short-Term (UX and Bug Fixes)

4. **Add Era selector to `LedgerForm.tsx`** and align the `schema.ts` default with the form default.

5. **Fix duplicate IPC listener** by consolidating `onLensImageReceived` registration into `useLens` and exposing an `onImageReceived` callback.

6. **Add Delete button to `CoinDetail.tsx`** with confirmation dialog. Wire to `window.electronAPI.deleteCoin`.

7. **Add error state for form submission failure** in `useCoinForm` and render it in `Scriptorium.tsx`.

8. **Replace `<li onClick>` in `PatinaSidebar`** with `<button>` elements for keyboard accessibility.

### Medium-Term (Code Quality and Coverage)

9. **Write tests for `validation.ts`** to achieve the mandated 100% branch coverage. Add tests for `Scriptorium.tsx`, `PlateEditor.tsx`, and `useLens.ts`.

10. **Eliminate all `any` types** (`Scriptorium.tsx`, `useCoinForm.ts`, `LedgerForm.tsx`, `server.ts`). Run `npx tsc --noEmit --strict` with `noImplicitAny: true` explicitly if not already enabled via `strict`.

11. **Move `ErrorBoundary` inline styles to `index.css`.** Restores compliance with the "Vanilla CSS only" mandate.

12. **Fix color contrast** for `--text-muted` (darken to ~`#6A6764`) and remove the 0.6rem font size.

13. **Add missing form fields** (`issuer`, `denomination`) to `LedgerForm`.

14. **Remove `bypassCSP: true`** from the `patina-img` protocol privileges and update the CSP to include `img-src patina-img:` instead.

---

*Report generated by full-source static analysis. All file references use the project root as the base path. Line numbers are accurate as of the review date.*
