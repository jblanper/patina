# Implementation Blueprint: SCR-03 · PlateEditor Redesign

**Date:** 2026-03-31
**Status:** Draft
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
const handleImportFile = async (slot: 'obverse' | 'reverse' | 'edge') => {
  setActiveSlot(slot);
  try {
    const path = await window.electronAPI.importImageFromFile();
    if (path) {
      onImageCaptured(slot, path);
    }
  } catch (err) {
    console.error('File import failed:', err);
    // TODO: surface import error in a future polish sprint
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
    if (e.key === 'Escape') {
      setShowQR(false);
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

**Status:** Pending

### Audit Findings:
- **System Integrity:** The `image:importFromFile` IPC handler is the only new cross-process surface. It takes zero renderer-supplied arguments (the `dialog` runs in the Main process and cannot be spoofed from the renderer). The return value is a safe relative path.
- **Abstraction:** The handler correctly encapsulates filesystem path management in the Main process. The renderer receives only a relative path string — no absolute filesystem paths are exposed.
- **P-04 path construction:** The `imagesDir` computation is duplicated from `src/main/server.ts`. This is acceptable for now but should be extracted to a shared utility in `src/main/` in a future refactor sprint.

### Review Notes & Suggestions:
- The `image:importFromFile` handler copies the user's file to `data/images/coins/`. If the user imports a file and then cancels the coin form (without saving), the copied file becomes orphaned on disk. This is a known limitation documented in the audit — flag it for a future cleanup sprint. It is consistent with the existing Lens behaviour (Lens-uploaded files can also be orphaned if the form is abandoned).
- Confirm `fs.promises.mkdir` with `{ recursive: true }` is used — not `mkdirSync` — to keep the handler fully async.
- The focus trap `useEffect` in A-01 uses `document.addEventListener` — ensure the cleanup `return () => document.removeEventListener(...)` is in place to avoid leaked listeners.

---

## 5. Security Assessment (`securing-electron`)

**Status:** Pending

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

**Status:** Pending

### Audit Findings:
- **Coverage Check:** `PlateEditor.tsx` is currently untested. This blueprint mandates a new `PlateEditor.test.tsx` with 8 test cases covering all changes. The main-process IPC handler for P-04 requires either integration tests (if the main test infrastructure supports it) or explicit manual verification documented in the retrospective.
- **Async Safety:** P-04 tests must `await` the `handleImportFile` invocation and use `findBy*` for the resulting UI state change.

### Review Notes & Suggestions:
- The focus trap (A-01) involves `document.addEventListener` in a `useEffect`. Test the cleanup by unmounting the component with QR open and asserting the global listener is removed (use `vi.spyOn(document, 'removeEventListener')`).
- The `importImageFromFile` IPC handler should be tested in isolation with mocked `dialog` and `fs.promises`. If main-process testing infrastructure does not exist, create `src/main/__tests__/ipc-image-import.test.ts` using Node's `test` runner or Vitest.
- Mock `startLens` in PlateEditor tests to avoid real server spin-up.

---

## 7. UI Assessment (`curating-ui`)

**Status:** Pending — Three-Path proposal REQUIRED before implementation of P-03

### Gate: Three-Path Proposal

`curating-ui` must produce a Three-Path visual mockup using `assets/proposal_template.html` for the following paths before implementation of P-03 proceeds:

- **Path A:** Hero + Strip (large primary, 2-slot horizontal strip)
- **Path B:** Tabbed Plates (single frame with Obverse · Reverse · Edge tabs)
- **Path C:** Asymmetric Split (2-column sub-grid within the left folio)

Each mockup must demonstrate:
1. Desktop layout (≥1000px)
2. Mobile layout (<1000px)
3. Active-slot highlight state
4. Empty-slot CTA state
5. Filled-slot state with Replace + Remove actions

### Pending Findings (non-layout items):
- **P-01 Clear button:** The `.btn-plate-clear` and `.btn-plate-action` buttons in the caption area must meet the 44px touch target mandate. Current spec uses `0.25rem 0.5rem` padding — this may be insufficient. Verify computed height ≥ 44px or add `min-height: 44px`.
- **P-05 active hint:** The `.plate-active-hint` animation (`fadeIn 0.2s`) is subtle and appropriate. Confirm it does not trigger `prefers-reduced-motion` concerns — add `@media (prefers-reduced-motion: reduce) { .plate-active-hint { animation: none; } }`.
- **A-01 QR heading:** The `.qr-dialog-title` renders the same text as the `.qr-hint` paragraph below the QR code. Consider whether the heading is truly visible or should be visually hidden (`.sr-only` equivalent) while remaining accessible to screen readers.

### Review Notes & Suggestions:
- Awaiting Three-Path proposal output.

---

## 8. Numismatic & UX Assessment (`curating-coins`)

**Status:** Pending

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
1. **P-03 layout path:** Which of the Three Paths (A: Hero+Strip, B: Tabbed, C: Asymmetric) is selected? Awaiting `curating-ui` mockup delivery before this question can be answered.

2. **P-01 file orphan policy:** When a user clears a slot (via the Remove button), the form draft is updated but the file on disk is not deleted. This is intentional for add mode. For edit mode, should clearing a slot also call `deleteImage(existingImageId)` immediately, or should it be deferred to form submit? (Recommendation: deferred to submit — avoids partial state if the user cancels the edit.)

3. **P-04 error feedback:** If `importImageFromFile` fails (unsupported type, file read error), should the error surface in a toast-style notification or inline below the slot? Current spec logs to console only.

### Final Decisions:
- *(Awaiting `curating-ui` Three-Path proposal and user input.)*

---

## 10. Post-Implementation Retrospective

**Date:** *(To be completed after implementation)*
**Outcome:** *(Pending)*

### Summary of Work
- *(To be filled in.)*

### Pain Points
- *(To be filled in.)*

### Things to Consider
- The `image:importFromFile` path construction duplicates the `imagesDir` logic from `server.ts`. Extract to `src/main/paths.ts` shared utility in a future refactor.
- Orphaned imported files (user imports, then abandons the form) should be addressed by a future cleanup sweep — track filenames of imported-but-unsaved images and delete on form cancel.
- **Core Doc Revision:** Add `image:importFromFile` to `docs/reference/ipc_api.md` under Image handlers. Update `docs/style_guide.md` with the new plate layout pattern once a path is selected. If `.sr-only` pattern is introduced for the QR heading, document it in `docs/style_guide.md` §Accessibility Patterns.
