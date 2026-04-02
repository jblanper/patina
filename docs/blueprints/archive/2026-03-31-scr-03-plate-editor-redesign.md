# Implementation Blueprint: SCR-03 · PlateEditor Redesign

**Date:** 2026-03-31
**Status:** Completed
**Reference:** `docs/audits/2026-03-31-scriptorium-audit.md` — items P-01, P-02, P-03, P-04, P-05, A-01
**Depends on:** SCR-01 (independent of SCR-02)

---

## 1. Objective

Redesign the PlateEditor (left folio of the Scriptorium) to resolve six defects identified in the 2026-03-31 audit. The changes span visual hierarchy, image management, local file import, interaction affordance, and QR dialog accessibility.

| Audit ID | Severity | Description |
|----------|----------|-------------|
| P-03 | 🟠 High | Three equal-weight full-width slots dominate the folio |
| P-01 | 🟠 High | No image removal capability per slot |
| P-02 | 🟠 High | Replace button is hover-only — inaccessible on touch/keyboard |
| P-04 | 🟡 Medium | "Import from Digital Archive" permanently disabled |
| P-05 | 🟡 Medium | Active-slot affordance is ambiguous |
| A-01 | 🟡 Medium | QR dialog missing `aria-labelledby` and focus trap |

### Gate: Three-Path Visual Proposal Required

**P-03 (plate layout redesign) is the structural centrepiece of this blueprint.** Before any implementation begins, `curating-ui` must deliver a Three-Path visual mockup for the new plate layout. Implementation of the layout change is blocked until a path is selected and approved. All other items (P-01, P-02, P-04, P-05, A-01) are independent and may be implemented in advance of or parallel to the layout decision.

### Philosophical Alignment

- [x] **Archival Ledger Aesthetic:** The primary plate (Obverse) is given commanding visual weight; secondary views (Reverse, Edge) recede into a supporting strip — mirroring numismatic publication conventions where the obverse leads.
- [x] **Privacy First:** Local file import uses the Electron `dialog.showOpenDialog()` API — no file leaves the machine, no external service is contacted. The imported file is copied to `data/images/coins/` using the same path management as the Lens.
- [x] **Single-Click Rule:** Capturing a photo (Lens) or importing a file remains a single button click from the plate slot. Image removal is one click (with no confirmation — it only affects the unsaved form state, not the database).

---

## 2. Technical Strategy

### 2.1 P-03 — PlateEditor layout redesign (Three-Path Gate)

**Gate condition:** This section cannot be finalised until `curating-ui` delivers a Three-Path proposal and the user selects a path. The architectural constraints for all three paths are documented below for the proposal to reference.

#### Architectural constraints for `curating-ui`

The new layout must satisfy:

1. **Obverse = primary.** The obverse plate must be visually dominant — larger frame, full-width or near-full-width within the left folio.
2. **Reverse + Edge = secondary strip.** These two slots must render smaller than the primary. The strip must be horizontal (two side-by-side thumbnails) beneath the primary plate.
3. **Active slot highlighted.** The currently targeted slot must be clearly indicated regardless of layout.
4. **No `aspect-ratio: 1` constraint on primary.** The primary frame should expand to use available height. The secondary strip items may keep `aspect-ratio: 1`.
5. **Mobile: single-column stack.** On `< 1000px`, all three slots stack vertically (same as current), but with reduced heights.
6. **CSS only** — no JS layout engines. The solution must be achievable with the existing CSS Grid / Flexbox toolkit.

#### Candidate paths (for `curating-ui` to render as mockups)

- **Path A — Hero + Strip:** Large primary frame (full width, ~60% of folio height), horizontal 2-slot strip below. Active slot has a sienna border. Caption labels below each frame.
- **Path B — Tabbed Plates:** A single frame, full folio width, with a tab strip above (Obverse · Reverse · Edge). Clicking a tab switches the visible plate slot. Avoids the vertical scroll entirely.
- **Path C — Asymmetric Split:** Primary frame takes 65% of folio width, secondary stack (Reverse above Edge) takes 35% right-side, in a 2-column sub-grid within the left folio. All three plates are simultaneously visible.

#### Implementation notes (path-agnostic)

- The `activeSlot` state in `PlateEditor.tsx` remains the same — only the CSS and JSX structure changes.
- The `plate-slot` / `plate-frame-edit` class hierarchy is restructured. New classes: `.plate-primary`, `.plate-secondary-strip`, `.plate-secondary-slot`.
- The `plate-stack` flex column is replaced by the new layout structure.

---

### 2.2 P-01 — Slot image removal

**File:** `src/renderer/components/PlateEditor.tsx`

Add a `onImageCleared` prop to `PlateEditorProps`:
```typescript
onImageCleared: (slot: 'obverse' | 'reverse' | 'edge') => void;
```

**File:** `src/renderer/components/Scriptorium.tsx`

Pass a `handleImageCleared` callback:
```tsx
const handleImageCleared = useCallback((slot: 'obverse' | 'reverse' | 'edge') => {
  updateImage(slot, '');
}, [updateImage]);
```

**In `PlateEditor.tsx`**, when a slot has an image, render a clear button in the `.plate-caption` area (outside the hover overlay — always visible):

```tsx
{images[slot.id] && (
  <div className="plate-caption-actions">
    <button
      className="btn-plate-clear"
      onClick={(e) => { e.stopPropagation(); onImageCleared(slot.id); }}
      aria-label={t('plateEditor.clearSlot', { slot: t(`plateEditor.slots.${slot.id}`) })}
    >
      {t('plateEditor.clearSlot', { slot: '' }).trim()} ×
    </button>
  </div>
)}
```

**CSS addition:**
```css
.plate-caption-actions {
  display: flex;
  justify-content: center;
  margin-top: 0.5rem;
}
.btn-plate-clear {
  background: none;
  border: none;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-bottom: 1px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}
.btn-plate-clear:hover {
  color: var(--error-red);
  border-bottom-color: var(--error-red);
}
```

**i18n addition:**
```json
"clearSlot": "Remove {{slot}}"
```

**Note:** Clearing a slot only updates `formData.images` in the renderer. It does not delete any file from disk (the image may belong to the existing saved record). Actual image deletion from the database and disk is handled separately by the `deleteImage` IPC handler when a coin is deleted or when an image is explicitly removed from the saved record. This is intentional — the form operates on a draft state.

---

### 2.3 P-02 — Accessible replace affordance

**File:** `src/renderer/components/PlateEditor.tsx`

The `.lens-cta-overlay` hover pattern is retained for desktop pointer users but supplemented with a persistent action below the caption for touch/keyboard users.

When a slot has an image, render a persistent "Replace" link below the caption:

```tsx
{images[slot.id] && (
  <button
    className="btn-plate-action"
    onClick={(e) => { e.stopPropagation(); handleStartLens(slot.id); }}
  >
    {t('plateEditor.replace')}
  </button>
)}
```

**CSS addition:**
```css
.btn-plate-action {
  background: none;
  border: none;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  transition: color 0.2s;
}
.btn-plate-action:hover,
.btn-plate-action:focus-visible {
  color: var(--accent-manuscript);
}
```

The `.lens-cta-overlay` remains for desktop hover — it provides a larger click target. The persistent button serves touch and keyboard users.

**Combine with P-01:** The `.plate-caption-actions` area from P-01 renders both `Replace` and `Remove ×` as siblings when a slot is filled, separated by a thin spacer.

---

### 2.4 P-04 — Local file import

This is the most architecturally significant item in this blueprint.

#### 2.4.1 Main Process — new IPC handler

**File:** `src/main/index.ts`

Add a new IPC handler `image:importFromFile`:

```typescript
ipcMain.handle('image:importFromFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Import Image',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
  });

  if (canceled || filePaths.length === 0) return null;

  const sourcePath = filePaths[0];
  const ext = path.extname(sourcePath).toLowerCase();
  const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

  if (!ALLOWED_EXTS.has(ext)) {
    throw new Error('Unsupported file type. Only JPEG, PNG, and WebP are accepted.');
  }

  const isDev = !app.isPackaged;
  const imagesDir = isDev
    ? path.join(process.cwd(), 'data', 'images', 'coins')
    : path.join(app.getPath('userData'), 'images', 'coins');

  await fs.promises.mkdir(imagesDir, { recursive: true });

  const uniqueName = `import-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const destPath = path.join(imagesDir, uniqueName);

  // Security: verify source path does not traverse outside allowed locations
  const resolvedSource = path.resolve(sourcePath);
  // dialog.showOpenDialog only returns user-selected paths — traversal not possible via the dialog.
  // The ext check above prevents non-image files from being copied.

  await fs.promises.copyFile(resolvedSource, destPath);

  // Return relative path (relative to data/images/ root, matching patina-img:// convention)
  return path.join('coins', uniqueName);
});
```

**Zod schema:** No new schema required. The handler takes no renderer-supplied arguments (the dialog runs entirely in the Main process). The return value is a relative path string or `null`.

#### 2.4.2 Preload bridge

**File:** `src/main/preload.ts`

```typescript
importImageFromFile: (): Promise<string | null> =>
  ipcRenderer.invoke('image:importFromFile'),
```

#### 2.4.3 Window type declaration

**File:** `src/renderer/types/electron.d.ts` (or wherever `window.electronAPI` is declared)

```typescript
importImageFromFile: () => Promise<string | null>;
```

#### 2.4.4 PlateEditor integration

**File:** `src/renderer/components/PlateEditor.tsx`

Add `handleImportFile` alongside the existing Lens handler:

```typescript
const [importError, setImportError] = useState<Partial<Record<'obverse' | 'reverse' | 'edge', boolean>>>({});

const handleImportFile = async (slot: 'obverse' | 'reverse' | 'edge') => {
  setActiveSlot(slot);
  setImportError((prev) => ({ ...prev, [slot]: false }));
  try {
    const path = await window.electronAPI.importImageFromFile();
    if (path) {
      onImageCaptured(slot, path);
    }
  } catch (err) {
    console.error('File import failed:', err);
    setImportError((prev) => ({ ...prev, [slot]: true }));
  }
};
```

Enable the "Import from Digital Archive" button by removing `disabled` and wiring it to `handleImportFile`:

```tsx
<button
  className="btn-lens-minimal"
  onClick={(e) => { e.stopPropagation(); handleImportFile(slot.id); }}
>
  {t('plateEditor.importArchive')}
</button>
```

---

### 2.5 P-05 — Active-slot caption annotation

**File:** `src/renderer/components/PlateEditor.tsx`

When a slot is active and empty, append an annotation below the existing `.plate-caption`:

```tsx
{activeSlot === slot.id && !images[slot.id] && (
  <p className="plate-active-hint">{t('plateEditor.activeHint')}</p>
)}
```

**CSS addition:**
```css
.plate-active-hint {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: var(--accent-manuscript);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: center;
  margin-top: 0.25rem;
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

**i18n addition:**
```json
"activeHint": "← Next capture will land here"
```

---

### 2.6 A-01 — QR dialog `aria-labelledby` and focus trap

**File:** `src/renderer/components/PlateEditor.tsx`

Add a heading to the QR container:

```tsx
<div className="qr-container" onClick={(e) => e.stopPropagation()}>
  <h2 id="qr-dialog-title" className="qr-dialog-title">
    {t('plateEditor.scanHint', { slot: t(`plateEditor.slots.${activeSlot}`).toUpperCase() })}
  </h2>
  <button className="qr-close" onClick={() => setShowQR(false)} aria-label={t('plateEditor.closeQr')}>×</button>
  <QRCodeDisplay url={url} />
  <p className="qr-hint">{t('plateEditor.scanHint', { slot: t(`plateEditor.slots.${activeSlot}`).toUpperCase() })}</p>
</div>
```

Update the overlay:
```tsx
<div className="qr-overlay" role="dialog" aria-modal="true"
  aria-labelledby="qr-dialog-title"
  onClick={() => setShowQR(false)}>
```

**Focus trap via `useEffect`:**

```typescript
const qrContainerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!showQR) return;

  const container = qrContainerRef.current;
  if (!container) return;

  // Move initial focus to close button
  const closeBtn = container.querySelector<HTMLElement>('.qr-close');
  closeBtn?.focus();

  const focusable = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowQR(false);
      return;
    }
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [showQR]);
```

Attach `ref={qrContainerRef}` to `.qr-container`.

**CSS addition for visually hidden heading (if h2 should not appear as a visible title):**
```css
.qr-dialog-title {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  text-align: center;
  margin-bottom: 1rem;
}
```

---

## 3. Verification Strategy

### Test Cases

**`PlateEditor.test.tsx`** (create if absent):

1. **P-01:** Render with `images={{ obverse: 'coins/test.jpg' }}`. Assert `.btn-plate-clear` is rendered for the obverse slot. Click it — assert `onImageCleared` called with `'obverse'`.
2. **P-01:** Render with no images. Assert no `.btn-plate-clear` is rendered.
3. **P-02:** Render with a filled obverse slot. Assert `.btn-plate-action` ("Replace") is visible without hovering — query by role `button` with name matching `t('plateEditor.replace')`.
4. **P-04:** Mock `window.electronAPI.importImageFromFile` to resolve with `'coins/imported-123.jpg'`. Click "Import from Digital Archive" on the obverse slot. Assert `onImageCaptured` called with `('obverse', 'coins/imported-123.jpg')`.
5. **P-04:** Mock `importImageFromFile` to resolve with `null` (user cancelled). Assert `onImageCaptured` is NOT called.
6. **P-05:** Render with `activeSlot='obverse'` and no obverse image. Assert `.plate-active-hint` is visible on the obverse slot. Assert it is NOT visible on reverse or edge slots.
7. **A-01:** Trigger QR display (mock Lens `startLens` to resolve). Assert dialog element has `aria-labelledby="qr-dialog-title"`. Assert element with `id="qr-dialog-title"` exists. Press Escape — assert QR is closed.
8. **A-01:** With QR open, focus the close button, then press Tab — assert focus cycles to the next focusable element within the dialog (not escape to background).

**Main process (integration test if test infrastructure exists for IPC):**

9. **P-04:** `image:importFromFile` handler — mock `dialog.showOpenDialog` to return a valid `.jpg` path. Assert file is copied to `imagesDir` and returned path starts with `coins/`.
10. **P-04:** Mock dialog to return a `.svg` path. Assert handler throws with unsupported type error.
11. **P-04:** Mock dialog to return `{ canceled: true }`. Assert handler returns `null`.

### Colocation Check
- `PlateEditor.test.tsx` → `src/renderer/components/__tests__/PlateEditor.test.tsx`
- Main process IPC tests → `src/main/__tests__/` (if the project has main-process test infrastructure; otherwise document as manual verification)

### Mocking Strategy
- `window.electronAPI.importImageFromFile` — mock via global mock in `setupTests.ts`, per-test override.
- `window.electronAPI` Lens methods (`startLens`, `stopLens`) — already mocked globally.
- For A-01 focus trap tests: use `userEvent.keyboard('{Tab}')` and assert `document.activeElement`.

---

## 4. Architectural Oversight (`curating-blueprints`)

**Status:** Complete

### Audit Findings:
- **System Integrity:** The `image:importFromFile` IPC handler is the only new cross-process surface. It takes zero renderer-supplied arguments (the `dialog` runs in the Main process and cannot be spoofed from the renderer). The return value is a safe relative path.
- **Abstraction:** The handler correctly encapsulates filesystem path management in the Main process. The renderer receives only a relative path string — no absolute filesystem paths are exposed.
- **P-04 path construction:** The `imagesDir` computation is duplicated from `src/main/server.ts`. This is acceptable for now but should be extracted to a shared utility in `src/main/` in a future refactor sprint.

### Review Notes & Suggestions:
- **A-01 Spec Bug (fixed in §2.6):** The original `handleKeyDown` snippet had `if (e.key !== 'Tab') return;` before the Escape check, making the Escape branch unreachable. §2.6 has been corrected: Escape is handled first with an early return, then the Tab guard follows.
- The `image:importFromFile` handler copies the user's file to `data/images/coins/`. If the user imports a file and then cancels the coin form (without saving), the copied file becomes orphaned on disk. This is a known limitation documented in the audit — flag it for a future cleanup sprint. It is consistent with the existing Lens behaviour (Lens-uploaded files can also be orphaned if the form is abandoned).
- Confirm `fs.promises.mkdir` with `{ recursive: true }` is used — not `mkdirSync` — to keep the handler fully async.
- The focus trap `useEffect` in A-01 uses `document.addEventListener` — ensure the cleanup `return () => document.removeEventListener(...)` is in place to avoid leaked listeners.

---

## 5. Security Assessment (`securing-electron`)

**Status:** Complete

### Audit Findings:
- **The Filter:** `image:importFromFile` takes no renderer-supplied arguments. No Zod schema is required on the input side. The return path is constructed entirely in the Main process from `Date.now()` + `Math.random()` — not from user input.
- **Protocols:** The copied file is stored in the `coins/` subdirectory and served via `patina-img://` — the existing path traversal check (`..` blocking in the protocol handler) remains in force.

### Review Notes & Suggestions:
- The `dialog.showOpenDialog` `filters` array restricts to `['jpg', 'jpeg', 'png', 'webp']` — this is the first line of defence. The explicit `ALLOWED_EXTS` `Set` check after the dialog is a defence-in-depth measure: even if a future Chromium version bypasses the filter, the extension check prevents non-image files from being copied.
- The `fs.promises.copyFile` call does not follow symlinks by default in Node.js — confirm this is acceptable. If the source file is a symlink pointing outside the user's home directory, `copyFile` would still copy the symlink target. This is acceptable for a local desktop application with no network boundary.
- SVG is explicitly not in the allowed extensions — consistent with the Lens MIME allowlist in `server.ts`. This must not change.
- Preload exposure: `importImageFromFile: () => ipcRenderer.invoke('image:importFromFile')` — the renderer cannot pass any arguments. This is the correct minimum-surface pattern.

---

## 6. Quality Assessment (`assuring-quality`)

**Status:** Complete

### Audit Findings:
- **Coverage Check:** `PlateEditor.tsx` is currently untested. This blueprint mandates a new `PlateEditor.test.tsx` with 8 test cases covering all changes. The main-process IPC handler for P-04 requires either integration tests (if the main test infrastructure supports it) or explicit manual verification documented in the retrospective.
- **Async Safety:** P-04 tests must `await` the `handleImportFile` invocation and use `findBy*` for the resulting UI state change.

### Review Notes & Suggestions:
- The focus trap (A-01) involves `document.addEventListener` in a `useEffect`. Test the cleanup by unmounting the component with QR open and asserting the global listener is removed (use `vi.spyOn(document, 'removeEventListener')`).
- The `importImageFromFile` IPC handler should be tested in isolation with mocked `dialog` and `fs.promises`. If main-process testing infrastructure does not exist, create `src/main/__tests__/ipc-image-import.test.ts` using Node's `test` runner or Vitest.
- Mock `startLens` in PlateEditor tests to avoid real server spin-up.

---

## 7. UI Assessment (`curating-ui`)

**Status:** Partially Complete — caption action bar redesign pending implementation

> **Mockup (P-03 layout):** `docs/curating-ui/proposal_plate_layout_three_path_2026-04-01.html`
> **Mockup (caption action bar):** `docs/curating-ui/proposal_plate_actions_three_path_2026-04-02.html`
>
> Note: `assets/proposal_template.html` referenced in the gate description does not exist in this repository. Mockups were produced as standalone HTML files following the established `docs/curating-ui/` convention.

### Gate: Three-Path Proposal (P-03 Layout) — Resolved

Three-path mockup delivered (2026-04-01). Path A (Hero + Strip) selected. Implemented. See Decision 1 in §9.

### Resolved Pending Findings

- **P-01 Clear button touch targets:** ✅ Resolved — `min-height: 44px` applied to `.btn-plate-action` and `.btn-plate-clear`.
- **P-05 active hint reduced-motion:** Outstanding — `@media (prefers-reduced-motion: reduce) { .plate-active-hint { animation: none; } }` not yet added to `index.css`.
- **A-01 QR heading duplication:** ✅ Resolved (2026-04-02) — Three sources of duplicate scan text identified and eliminated:
  1. `h2.qr-dialog-title` converted to `.sr-only` — serves `aria-labelledby` only, invisible on screen.
  2. `<p class="qr-hint">` removed — `QRCodeDisplay` already renders `lens.scanPrompt`.
  3. `.sr-only` utility class added to `index.css` (replaces `.qr-dialog-title` visual style).

### Post-Implementation Bug Fixes (2026-04-02)

Three bugs discovered during verification and fixed:

**Bug 1 — QR dialog triple scan text**
The dialog rendered the scan hint three times: once in `h2.qr-dialog-title`, once inside `QRCodeDisplay` (`lens.scanPrompt`), and once in `p.qr-hint`. Fix: `h2` made `.sr-only` (ARIA intact); `p.qr-hint` removed.

**Bug 2 — Replace action wired to QR only**
`renderCaptionActions` "Replace" button called `handleStartLens` exclusively — the file import path added in P-04 was not surfaced in the filled-slot action row. Fix: "Import" button added to `renderCaptionActions` alongside "Replace", wiring to `handleImportFile`. New i18n key `plateEditor.importFile` added to both locales.

**Bug 3 — Language selector at page bottom**
`LanguageSelector` was inside `.sidebar-footer` at the very bottom of `PatinaSidebar`. Fix: moved to a new `.sidebar-language` wrapper directly above the footer, between the last filter group and the Reset button.

### Caption Action Bar — New Three-Path Proposal (2026-04-02)

**Context:** After bug fixes, the three-button caption action row (REEMPLAZAR · IMPORTAR · ELIMINAR ×) was found to be visually poor — wrapping onto two lines on narrow secondary slots, with "ELIMINAR" and "×" splitting across lines on the narrowest slots.

**Interim fix applied:** `white-space: nowrap` on buttons; `flex-wrap: wrap` on `.plate-caption-actions`; separator `<div>`s replaced by `border-left` modifier class (`.btn-plate-action--sep`) to prevent orphaned dividers on wrap. This resolved the worst layout breakage but the text-only row remains aesthetically unsatisfying.

**Three-path proposal delivered** (`docs/curating-ui/proposal_plate_actions_three_path_2026-04-02.html`):

| Path | Concept | Key characteristic |
|------|---------|-------------------|
| A — Icon Trio | Icon + label per button; icon-only + tooltip on secondary slots | Always visible, one click, no wrapping possible |
| B — Overflow Menu | Single "···" trigger reveals dropdown | Cleanest caption area; one extra click per action |
| C — In-Frame Toolbar | Actions slide up inside the plate frame on hover; ghost icons below for secondary | Zero caption noise; dual control surfaces on secondary slots |

**Recommendation: Path A.** See Decision 4 in §9.

### Review Notes & Suggestions:
- The `.sr-only` class introduced for the QR heading should be documented in `docs/style_guide.md` §Accessibility Patterns as the canonical visually-hidden pattern for the project.
- `@media (prefers-reduced-motion: reduce) { .plate-active-hint { animation: none; } }` still outstanding — add before closing verification.

---

## 8. Numismatic & UX Assessment (`curating-coins`)

**Status:** Complete

### Audit Findings:
- **Historical Accuracy:** Not applicable — no data model changes.
- **Collector UX:** The equal-weight three-slot layout (P-03) is the single largest UX friction point in the current Scriptorium. In all major auction house catalogues (CNG, NAC, Numismatica Ars Classica), the obverse is the primary image — larger, on the left, always present. Reverse is secondary. Edge is tertiary and often omitted entirely for ancient coins. The Hero + Strip pattern (Path A) most closely matches this publication convention.

### Review Notes & Suggestions:
- Strongly recommend **Path A (Hero + Strip)** from a numismatic convention standpoint. The obverse is the identity face — it should be the visual anchor of the Scriptorium's image panel.
- **Path B (Tabbed)** hides Reverse and Edge — this is a visual regression for collectors who want to compare all faces simultaneously during cataloguing.
- **Path C (Asymmetric Split)** is acceptable but the narrow right column for Reverse + Edge may be too cramped for useful image preview.
- The file import feature (P-04) is essential for migration workflows. Most serious collectors digitise their holdings using a flatbed scanner or DSLR — they will have files on disk, not on a phone. The Lens-only workflow is a barrier to adoption.

---

## 9. User Consultation & Decisions

### Open Questions:
1. ~~**P-03 layout path**~~ — **Resolved. See Decision 1.**
2. ~~**P-01 file orphan policy**~~ — **Resolved. See Decision 2.**
3. ~~**P-04 error feedback**~~ — **Resolved. See Decision 3.**
4. ~~**Caption action bar design**~~ — **Resolved. See Decision 4.**

### Final Decisions:

**Decision 1 — P-03 Layout Path:** **Path A (Hero + Strip).** Large primary frame (full folio width, 4:3 aspect ratio), horizontal 2-slot strip below for Reverse and Edge. Active slot receives a sienna border. Strip items retain `aspect-ratio: 1`. On mobile (`< 1000px`), strip becomes a 2-column sub-row beneath the primary, which stacks as a full-width column. New CSS classes: `.plate-primary`, `.plate-secondary-strip`, `.plate-secondary-slot`.

**Decision 2 — P-01 Edit-Mode Orphan Policy:** Clearing a slot in edit mode defers the image deletion to form submit. `onImageCleared` updates `formData.images` only. When the form is saved, the submit handler is responsible for comparing the original saved image IDs against the new draft and calling `deleteImage` for any that were removed. This avoids partial state if the user cancels the edit.

**Decision 3 — P-04 Error Feedback:** **(b) Inline below the slot.** A `plate-import-error` paragraph in the caption area surfaces the error contextually at the affected slot. No state-lifting or new component required. The `ExportToast` component is scoped to the export flow and must not be repurposed here. A general toast system is a future sprint concern.

```tsx
{importError[slot.id] && (
  <p className="plate-import-error">{t('plateEditor.importError')}</p>
)}
```

i18n key: `"importError": "Import failed. Only JPEG, PNG, and WebP files are accepted."` (implemented)

CSS addition (implemented):
```css
.plate-import-error {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: var(--error-red);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: center;
  margin-top: 0.25rem;
}
```

**Decision 4 — Caption Action Bar Design:** **Path A (Icon Trio).** Three icon+label buttons replace the plain-text row. On the primary (wide) slot, each button shows an SVG glyph above its uppercase label. On secondary (narrow) slots, labels are hidden and a tooltip appears on hover, preventing any wrapping. The destructive Remove button uses a trash glyph (distinct from Replace's circular-arrows and Import's download-arrow) and turns `--error-red` on hover.

Rationale for Path A over alternatives:
- **vs Path B (Overflow):** Path B adds a mandatory extra click for every action — Replace and Import are used frequently during cataloguing sessions, making the friction cost high. "Acciones" is too generic for the archival register.
- **vs Path C (In-Frame Toolbar):** Path C creates two separate control surfaces on secondary slots (in-frame hover toolbar + ghost icons below caption) — a design contradiction. The toolbar also partially obscures the image at the bottom edge.
- **Path A advantage:** Icons cannot wrap; secondary slots collapse to icon-only cleanly; one click to any action; the trash glyph passively signals destructive intent before hover, not only during it.

Implementation spec for Path A (pending):
- Replace `.btn-plate-action` text-only buttons with icon + label structure in `renderCaptionActions`
- Secondary slot compact variant: labels hidden via modifier class; `::after` pseudo-element tooltip
- SVG icons: circular-arrows (Replace), download-arrow (Import), trash (Remove)
- Remove `.btn-plate-action--sep` border-left separator; use `gap` on the container instead
- i18n keys unchanged (`plateEditor.replace`, `plateEditor.importFile`, `plateEditor.clearSlot`)
- New i18n key `plateEditor.importFile` already added (EN: "Import", ES: "Importar")

---

## 10. Post-Implementation Retrospective

**Date:** 2026-04-02
**Outcome:** Completed

### Summary of Work (to date)

All six original audit items (P-01 through P-05, A-01) implemented. Three bugs found during verification and fixed same session. Caption action bar identified as a secondary UX issue; three-path proposal delivered; Path A (Icon Trio) selected; implementation pending.

**Completed:**
- P-03: Hero + Strip layout (Path A) — `.plate-primary`, `.plate-secondary-strip`, `.plate-secondary-slot`
- P-01: Image removal per slot — `onImageCleared` prop, `btn-plate-clear` button in caption area
- P-02: Accessible Replace affordance — persistent `btn-plate-action` button below caption
- P-04: Local file import — `image:importFromFile` IPC handler, preload bridge, `handleImportFile` in `PlateEditor`
- P-04 (Bug Fix): Import button also added to the filled-slot caption action row (was missing)
- P-05: Active-slot annotation — `.plate-active-hint` with `fadeIn` animation
- A-01: QR dialog `aria-labelledby`, focus trap, Escape key handler
- A-01 (Bug Fix): Triple scan text eliminated — `h2` converted to `.sr-only`, `p.qr-hint` removed
- Language selector repositioned — moved above `.sidebar-footer` into new `.sidebar-language` wrapper
- Caption action bar interim fix — `white-space: nowrap`, `flex-wrap: wrap`, `border-left` separator on buttons
- Caption action bar icon redesign (Decision 4 / Path A Icon Trio) — `.btn-plate-icon-action` replaces text-only buttons; SVG glyphs (circular-arrows, download-arrow, trash); primary slots show icon + label, compact secondary slots show icon-only with `::after` tooltip; `aria-hidden` on SVGs, `aria-label` on compact buttons; `@media (prefers-reduced-motion: reduce)` applied to `.plate-active-hint`
- Caption action bar visual polish — `gap: 0.4rem` between icon and label; two `<div class="plate-action-sep">` hairline dividers between the three buttons; `justify-content: center` on icon buttons to vertically centre icons within the 44px touch target

**Pending:** *(none — all items resolved)*

### Pain Points

- **A-01 heading duplication** was flagged in the §7 UI Assessment ("Consider whether the heading is truly visible…") but not resolved before implementation — caught only during visual verification. The three-source duplication (`h2`, `QRCodeDisplay`, `p.qr-hint`) was not obvious from reading the code alone; it required a rendered view to spot.
- **Caption action row wrapping** was not anticipated because the spec was written against the primary (wide) slot only. The secondary strip (~200px) is significantly narrower — the three-button text row was always going to break there.
- **Replace-only QR** in `renderCaptionActions` was a spec omission: §2.4 specified file import for the empty-slot CTA but did not explicitly extend it to the filled-slot replace flow. The oversight was caught during verification.

### Things to Consider

- The `image:importFromFile` path construction duplicates the `imagesDir` logic from `server.ts`. Extract to `src/main/paths.ts` shared utility in a future refactor.
- Orphaned imported files (user imports, then abandons the form) should be addressed by a future cleanup sweep — track filenames of imported-but-unsaved images and delete on form cancel.
- **Core Doc Revision (outstanding):**
  - Add `image:importFromFile` to `docs/reference/ipc_api.md` under Image handlers.
  - Document `.sr-only` in `docs/style_guide.md` §Accessibility Patterns as the canonical visually-hidden pattern.
  - Update `docs/style_guide.md` with the new plate layout classes (`.plate-primary`, `.plate-secondary-strip`, `.plate-secondary-slot`) once verification is complete.
- When implementing the icon redesign (Decision 4), consider updating the test for P-02 to query by icon role rather than button text — the label disappears on secondary slots.
