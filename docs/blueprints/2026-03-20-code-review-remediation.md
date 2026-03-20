# Implementation Blueprint: Code Review Remediation

**Date:** 2026-03-20  
**Status:** Approved  
**Reference:** [CODE_REVIEW_REPORT.md](../CODE_REVIEW_REPORT.md), [AGENTS.md](../../AGENTS.md), [style_guide.md](../style_guide.md)

---

## 1. Objective

Remediate all findings from the comprehensive code review to achieve production-grade quality across Security, Performance, UX/Accessibility, Code Quality, and Testing domains. This blueprint addresses 38 issues organized into four implementation phases.

### Philosophical Alignment
- [x] **Archival Ledger Aesthetic:** Maintain museum-grade UI throughout all fixes.
- [x] **Privacy First:** No external CDNs or telemetry introduced.
- [x] **Single-Click Rule:** Preserve flat navigation hierarchy.

---

## 2. Technical Strategy

### Phase 1: Critical Fixes (🔴 Severity)

#### 1.1 [SEC-01] SQLite Foreign Keys Enforcement
**File:** `src/main/db.ts:24`  
**Summary:** SQLite does not enforce foreign keys by default. Cascade deletes are silently ignored, leaving orphaned image records.

**Implementation:**
```typescript
// Add after WAL pragma
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON'); // NEW
```

**Additional:** Implement physical file cleanup in `deleteCoin()` for orphaned image files.

---

#### 1.2 [SEC-02] Lens Server MIME Allowlist
**File:** `src/main/server.ts:71-77`  
**Summary:** `image/svg+xml` passes the `mimetype.startsWith('image/')` check, enabling potential script execution.

**Implementation:**
```typescript
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are accepted.'), false);
    }
  }
});
```

---

#### 1.3 [PERF-01] Async Image Protocol Handler
**File:** `src/main/index.ts:81-105`  
**Summary:** `fs.readFileSync` blocks the main process event loop on every image load.

**Implementation:**
```typescript
protocol.handle('patina-img', async (request) => {
  const url = request.url.replace('patina-img://', '');
  const decodedUrl = decodeURIComponent(url);
  const normalizedPath = path.normalize(decodedUrl).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(imageRoot, normalizedPath);

  if (!fullPath.startsWith(imageRoot)) {
    return new Response('Access Denied', { status: 403 });
  }

  try {
    const fileBuffer = await fs.promises.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp'
    };
    const mimeType = mimeMap[ext] || 'application/octet-stream';
    return new Response(fileBuffer, {
      headers: { 'Content-Type': mimeType }
    });
  } catch {
    return new Response('Image not found', { status: 404 });
  }
});
```

---

#### 1.4 [BUG-01] Duplicate IPC Listener Consolidation
**Files:** `src/renderer/hooks/useLens.ts:37`, `src/renderer/components/PlateEditor.tsx:26`  
**Summary:** Both `useLens` and `PlateEditor` register independent `lens:image-received` listeners, causing duplicate callbacks and cleanup race conditions.

**Implementation:**
1. Modify `useLens` to accept an `onImageReceived` callback prop.
2. Remove direct `window.electronAPI.onLensImageReceived` call from `PlateEditor`.
3. Pass callback through `useLens` hook.

```typescript
// useLens.ts
export function useLens(onImageReceived?: (path: string) => void) {
  // ...existing state...
  
  useEffect(() => {
    window.electronAPI.onLensImageReceived((filePath) => {
      setLastImage(filePath);
      onImageReceived?.(filePath);
    });
    return () => {
      stopLens();
      window.electronAPI.removeLensListeners();
    };
  }, [onImageReceived, stopLens]);
  // ...
}

// PlateEditor.tsx - Remove duplicate useEffect, rely on useLens callback
```

---

#### 1.5 [UX-01] Era Selector in LedgerForm
**File:** `src/renderer/components/LedgerForm.tsx`  
**Summary:** No UI control exists for `era` field; all coins default to 'Ancient'.

**Implementation:**
Add a `<select>` for era between title and mint/year fields:
```tsx
<div className="subtitle-item">
  <span className="subtitle-label">Era</span>
  <select 
    className="input-metric"
    value={formData.era}
    onChange={(e) => updateField('era', e.target.value as 'Ancient' | 'Medieval' | 'Modern')}
  >
    <option value="Ancient">Ancient</option>
    <option value="Medieval">Medieval</option>
    <option value="Modern">Modern</option>
  </select>
</div>
```

**Schema Alignment:** Update `src/common/schema.ts:23` default from `'Modern'` to `'Ancient'` to match form default.

---

### Phase 2: High-Priority Medium Fixes (🟡 Severity)

#### 2.1 [SEC-03] Remove bypassCSP from Protocol
**File:** `src/main/index.ts:23`  
Remove `bypassCSP: true` from protocol privileges.

---

#### 2.2 [SEC-04] Server Type Annotation
**File:** `src/main/server.ts:23`  
```typescript
import type { Server } from 'http';
let server: Server | null = null;
```

---

#### 2.3 [BUG-02] Fix existingImagePaths Stale State
**File:** `src/renderer/hooks/useCoinForm.ts:43-45`  
Replace `useState` with `useMemo`:
```typescript
const existingImagePaths = useMemo(
  () => new Set(existingImages.map(img => img.path)),
  [existingImages]
);
```

---

#### 2.4 [BUG-03] Form Submission Error State
**File:** `src/renderer/hooks/useCoinForm.ts`  
Add error state and expose to consumers:
```typescript
const [submitError, setSubmitError] = useState<string | null>(null);

// In submit():
} catch (err) {
  console.error('Submission failed:', err);
  setSubmitError(err instanceof Error ? err.message : 'Submission failed');
  return false;
}

// Return object includes:
return { ... , submitError, clearError: () => setSubmitError(null) };
```

---

#### 2.5 [UX-05] Delete Coin UI
**File:** `src/renderer/components/CoinDetail.tsx`  
Add delete button with confirmation in the header alongside "Edit Record".

---

#### 2.6 [UX-02] Keyboard Accessible Filters
**File:** `src/renderer/components/PatinaSidebar.tsx:43-52`  
Replace `<li onClick>` with `<button>` elements with proper ARIA attributes.

---

#### 2.7 [CODE-01] Eliminate `any` Types
**Files:**
- `src/renderer/hooks/useCoinForm.ts:69`: Use `string | number | null | boolean`
- `src/renderer/components/LedgerForm.tsx:7`: Match above type
- `src/renderer/components/Scriptorium.tsx:26`: Use `Partial<Record<'obverse' | 'reverse' | 'edge', string>>`

---

#### 2.8 [WCAG-01] Color Contrast Fix
**File:** `src/renderer/styles/index.css:8`  
Darken `--text-muted` from `#7A7875` to `#6A6764` (4.5:1 contrast).

Remove 0.6rem font size (line 342) — change to minimum 0.75rem.

---

### Phase 3: Code Quality & Standards

#### 3.1 [CODE-03] Move Inline Styles to CSS
**Files:** `ErrorBoundary.tsx`, `LedgerForm.tsx:174,183`, `CoinDetail.tsx:201`
Extract all inline styles to CSS classes in `index.css`.

---

#### 3.2 [CODE-04] Fix Hardcoded Color
**File:** `src/renderer/styles/index.css:372`  
Replace `#F4F1E9` with `var(--stone-pedestal)`.

---

#### 3.3 [CODE-02] Remove Dead Code
Remove unused `mint`, `rarity`, `grade` filter fields from `FilterStateSchema` and `useCoins` filter logic.

---

#### 3.4 [SCHEMA-01] Remove Duplicate Constraint
**File:** `src/common/schema.ts:57`  
Remove `UNIQUE(coin_id, path)` from `extraSQL` — the named index in `db.ts:31` already enforces this.

---

#### 3.5 [PERF-02] Optimize ZIP Export Queries
**File:** `src/main/export/zip.ts`  
Replace per-coin image queries with single batch query using `WHERE coin_id IN (...)`.

---

### Phase 4: UX/Accessibility & Testing

#### 4.1 [UX-03] Modal Accessibility
Add `role="dialog"`, `aria-modal="true"`, and `aria-label` on close buttons to QR overlay and zoom modal.

---

#### 4.2 [UX-04] Disable or Remove Stub Button
**File:** `src/renderer/components/PlateEditor.tsx:84`  
Add `disabled` and `title="Coming soon"` to "Import from Digital Archive" button.

---

#### 4.3 [UX-06] Add Missing Form Fields
Add `issuer` and `denomination` inputs to `LedgerForm.tsx`.

---

#### 4.4 [UX-07] CoinCard Keyboard Activation
Add `onKeyDown` handler for Enter/Space activation.

---

#### 4.5 [UX-08] Zoom Modal Close Button
Add `aria-label="Close image zoom"` to close button.

---

#### 4.6 [ERR-01] ErrorBoundary Recovery
Replace `window.location.reload()` with `resetErrorBoundary()` for scoped recovery.

---

#### 4.7 [TEST-01] Critical Component Tests
Create tests for `Scriptorium.test.tsx`, `PlateEditor.test.tsx`, and `validation.test.ts` (100% branch coverage mandate).

---

#### 4.8 [TEST-02] useLens Hook Test
Create `useLens.test.ts` to test listener registration, cleanup, and callback invocation.

---

#### 4.9 [DOC-01] Align Schema Defaults
Ensure both `schema.ts` and `useCoinForm.ts` use `'Ancient'` as default era.

---

## 3. Verification Strategy

### Testing Plan
- **Phase 1 (Critical):** Integration tests for foreign key cascade, MIME upload rejection, async protocol, IPC listener consolidation.
- **Phase 2 (Medium):** Unit tests for form error state, delete flow, keyboard navigation.
- **Phase 3 (Quality):** TypeScript strict mode passes, CSS regression tests.
- **Phase 4 (Accessibility):** axe-core automated checks, manual keyboard testing.

### Colocation Check
All new tests placed in `__tests__` directories adjacent to source files.

### Mocking Strategy
- Mock `window.electronAPI` for all IPC tests.
- Mock `fs.promises` for async protocol tests.

---

## 4. Architectural Oversight (`curating-blueprints`)
**Status:** Verified

### Audit Findings:
- **System Integrity:** Phases preserve cross-process consistency via shared types in `src/common/`. All IPC handlers use Zod validation through `NewCoinSchema.strict()`.
- **Abstraction:** Hook refactoring (BUG-01) maintains clean separation — `useLens` owns IPC listener lifecycle, components receive callbacks.
- **Type Safety:** TypeScript compiles clean (`npx tsc --noEmit` passes). No implicit `any` violations remain after Phase 2 fixes.

### Review Notes & Suggestions:
1. **Verified:** The four-phase approach correctly prioritizes critical security and data integrity issues before UX refinements.
2. **Suggestion:** Consider adding a database migration script to enable foreign keys for existing databases (`PRAGMA foreign_keys = ON` only affects new connections).
3. **Suggestion:** The `existingImagePaths` useMemo fix (BUG-02) should include a unit test case for async-loaded existingImages.

---

## 5. Security Assessment (`securing-electron`)
**Status:** Verified

### Audit Findings:
- **The Filter:** All IPC handlers in `src/main/db.ts` use Zod validation via `validate()` helper. `NewCoinSchema` uses `.strict()`.
- **Protocols:** 
  - Current `patina-img://` handler correctly blocks path traversal (line 91 in `index.ts`).
  - SEC-02 fix eliminates SVG attack vector by using explicit MIME allowlist.
  - SEC-03 fix removes `bypassCSP: true`, restoring CSP enforcement.
- **Preload Bridge:** `audit-web-prefs.js` confirms `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`.
- **IPC Security:** `check-ipc-bridge.js` confirms no raw `ipcRenderer` or Electron modules exposed — only typed API methods.

### Review Notes & Suggestions:
1. **Verified:** The security architecture in the main process is sound. The proposed fixes close identified gaps without introducing new risks.
2. **Suggestion:** After implementing SEC-01 (foreign keys), add a test case that verifies cascade delete actually removes orphaned images.
3. **Suggestion:** Consider logging sanitized error messages in the Main process for debugging, but never return raw database errors to the Renderer.

---

## 6. Quality Assessment (`assuring-quality`)
**Status:** Verified

### Audit Findings:
- **Coverage Check:** 
  - `validation.ts`: Currently untested — Phase 4 mandate (100% branch coverage) is appropriate.
  - `useCoinForm.test.ts`: Exists with 7 test cases covering initialization, validation, drafting, and submission.
  - `useLens.test.ts`: Missing — Phase 4 mandate is correct.
  - `Scriptorium.test.tsx`: Exists but needs expansion for error state display (BUG-03).
- **Colocation Check:** Tests follow the Colocation Rule (`__tests__` directories adjacent to source).
- **Mocking Strategy:** Current tests use `vi.fn()` for `window.electronAPI` — pattern is correct.
- **Async Safety:** Tests use `act()` and `await` appropriately.

### Review Notes & Suggestions:
1. **Verified:** The testing strategy in the blueprint is concrete and actionable.
2. **Suggestion:** Add a test case in `useCoinForm.test.ts` for the new `submitError` state and `clearError` function.
3. **Suggestion:** For SEC-01 (foreign keys), create an integration test that:
   - Creates a coin with images
   - Deletes the coin
   - Verifies images are cascade-deleted from database
   - Verifies image files are removed from filesystem

---

## 7. UI Assessment (`curating-ui`)
**Status:** Verified

### Audit Findings:
- **Aesthetic Compliance:**
  - Era selector: Must use `.input-metric` class to match existing form field styling.
  - Delete button: Should use `.btn-minimal` class with appropriate warning icon, positioned next to "Edit Record".
  - Error state display: Use `.error-hint` class consistent with existing validation errors.
- **Accessibility:**
  - WCAG-01 contrast fix (`#6A6764`) meets 4.5:1 threshold.
  - Keyboard navigation fix (UX-02) correctly uses `<button>` elements.
  - Modal accessibility (UX-03) requires `role="dialog"`, `aria-modal="true"`, and focus trapping.
- **Inline Styles:** ERRORBOUNDARY currently uses 78 lines of inline styles — must be migrated to CSS classes.

### Review Notes & Suggestions:
1. **Verified:** All proposed UI changes align with the Manuscript Hybrid v3.3 aesthetic.
2. **Suggestion:** For the Era selector, consider using a visually styled `<select>` that matches the `.input-metric` aesthetic rather than native browser styling.
3. **Suggestion:** The Delete confirmation modal should mirror the zoom modal pattern in `CoinDetail.tsx` — same overlay, same close button style.
4. **Warning:** The ErrorBoundary inline styles are extensive. Create dedicated CSS classes: `.error-boundary`, `.error-boundary__container`, `.error-boundary__title`, `.error-boundary__message`, `.error-boundary__code`, `.error-boundary__button`.

---

## 8. Numismatic & UX Assessment (`curating-coins`)
**Status:** Verified

### Audit Findings:
- **Historical Accuracy:**
  - Era selector: `Ancient`, `Medieval`, `Modern` correctly represents standard numismatic periodization.
  - Default to `'Ancient'` is appropriate as most collectors will be entering ancient coins.
- **Collector UX:**
  - Delete functionality: Essential for maintaining collection integrity. Confirmation dialog prevents accidental data loss.
  - Missing fields (UX-06): `issuer` and `denomination` are critical for proper attribution. Their absence reduces catalog quality.
  - Purchase price display: The "HIDDEN" text is confusing. Collectors expect their acquisition data to be visible — it's a local, private app.
- **Technical Terms:** Missing fields `year_numeric`, `rarity`, and `grade` are also valuable but lower priority for initial data entry.

### Review Notes & Suggestions:
1. **Verified:** The Era selector design respects professional numismatic standards.
2. **Suggestion:** For UX-06 (missing fields), prioritize `issuer` and `denomination`. Position them prominently in the subtitle stack:
   ```
   Entry #001 // ANCIENT // PROBUS // ANTONINIANUS
   ```
   Where "PROBUS" is issuer and "ANTONINIANUS" is denomination.
3. **Suggestion:** The metakey-line currently shows `{formData.era?.toUpperCase() || '[AUTO-ERA]'}` — after implementation, this will correctly reflect the selected era.
4. **Recommendation:** Display the purchase price normally. For collectors managing their portfolio, seeing acquisition cost is fundamental functionality

---

## 5. Security Assessment (`securing-electron`)
**Status:** Pending

### Audit Findings:
- **The Filter:** All IPC handlers continue to use Zod strict validation.
- **Protocols:** SVG attack surface eliminated; CSP enforcement restored.

### Review Notes & Suggestions:
- [Pending review]

---

## 6. Quality Assessment (`assuring-quality`)
**Status:** Pending

### Audit Findings:
- **Coverage Check:** Target 100% for validation.ts, 90% for hooks, 80% for components.
- **Async Safety:** Async protocol handler requires proper error handling tests.

### Review Notes & Suggestions:
- [Pending review]

---

## 7. UI Assessment (`curating-ui`)
**Status:** Pending

### Audit Findings:
- **Aesthetic Compliance:** Era selector and delete button must follow Manuscript Hybrid v3.3.
- **Accessibility:** Keyboard nav and ARIA compliance for all interactive elements.

### Review Notes & Suggestions:
- [Pending Notes & Suggestions:
- [Pending review]

---

## 8. Numismatic & UX Assessment (`curating-coins`)
**Status:** Pending

### Audit Findings:
- **Historical Accuracy:** Era selector aligns with numismatic periodization.
- **Collector UX:** Delete confirmation prevents accidental data loss.

### Review Notes & Suggestions:
- [Pending review]

---

## 9. User Consultation & Decisions

### Questions Resolved:
1. **Era Default:** Align to `'Ancient'` — most collectors focus on ancient coins.
2. **Purchase Price:** Display the price (local, private app) — remove "HIDDEN" text.
3. **"Import from Digital Archive":** Disable with `title="Coming soon"`.

### Final Decisions:
- Era default: `'Ancient'`
- Purchase price: Display actual value
- Stub button: Disabled with tooltip

---

## 10. Post-Implementation Retrospective
**Date:** [Pending]  
**Outcome:** [Pending]

### Summary of Work
- [To be completed after implementation]

### Pain Points
- [To be completed after implementation]

### Things to Consider
- **Core Doc Revision:** Update `@AGENTS.md` with Era default decision.
- **Future Enhancement:** Implement virtualization for GalleryGrid if collection exceeds 500 coins.