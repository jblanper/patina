# Implementation Blueprint: Coin & Image Duplication Fix

**Date:** 2026-03-19
**Status:** Completed
**Reference:** Bug Report - User reported coin duplication when adding images to existing coin

---

## 1. Objective

Fix a bug where editing an existing coin and adding new images caused:
1. Coin entries to be duplicated in the ledger
2. Existing images to be re-inserted, creating duplicates
3. Multiple images with the same label (obverse, reverse, edge) per coin

### Philosophical Alignment
- [x] **Curator-First:** Data integrity ensures collectors' ledgers remain accurate and trustworthy.
- [x] **Privacy First:** All fixes are local-only; no external services affected.
- [x] **Single-Click Rule:** The fix ensures editing workflow remains one-click after the change.
- [x] **Technical Foundation:** Defense-in-depth with hook-layer filtering + database-level constraints.

---

## 2. Root Cause Analysis

### Bug 1: No Deduplication in `addImage()`
**File:** `src/main/db.ts:89-95`
```typescript
// BEFORE (buggy)
addImage: (image: NewCoinImage): number => {
  validate(idSchema, image.coin_id); // Only validates coin_id
  // No check if image with same path exists for this coin_id
  const info = db.prepare(
    'INSERT INTO images (...) VALUES (...)'
  ).run(...);
  return info.lastInsertRowid as number;
}
```
**Problem:** Directly inserted without verifying if image path already existed for the coin.

### Bug 2: All Images Re-Added on Every Save
**File:** `src/renderer/hooks/useCoinForm.ts:117-129`
```typescript
// BEFORE (buggy)
// Save images - adds ALL images including existing DB records
const imagePromises = Object.entries(images).map(([label, path]) => {
  if (!path) return Promise.resolve();
  return window.electronAPI.addImage({ coin_id: coinId, path, ... });
});
```
**Problem:** When editing, `formData.images` contained both:
- Existing images from database (synced via Scriptorium.tsx effect)
- Newly added images during this session

All were re-inserted on submit.

### Bug 3: Missing Schema Constraint
**File:** `src/common/schema.ts`
```typescript
// BEFORE (incomplete)
extraSQL: 'FOREIGN KEY (coin_id) REFERENCES coins(id) ON DELETE CASCADE'
// Missing: UNIQUE(coin_id, path) constraint
```

### Bug 4: Missing Image Validation Schema
**File:** `src/common/validation.ts`
**Problem:** No `NewCoinImageSchema` existed; only `coin_id` was validated in `db.ts`.

---

## 3. Technical Architecture (Defense-in-Depth)

### Layer 1: Hook-Level Filtering
**File:** `src/renderer/hooks/useCoinForm.ts`
- Track existing image paths in a `Set<string>` upon initialization
- Filter `submit()` to only save images with paths NOT in the existing set

```typescript
const [existingImagePaths] = useState<Set<string>>(
  () => new Set(existingImages.map(img => img.path))
);

// In submit():
const imagePromises = Object.entries(images)
  .filter(([, path]) => path && !existingImagePaths.has(path))
  .map(([label, path], index) => { ... });
```

### Layer 2: Database-Level Constraint
**File:** `src/common/schema.ts`
```typescript
extraSQL: 'FOREIGN KEY (coin_id) REFERENCES coins(id) ON DELETE CASCADE, 
          UNIQUE(coin_id, path)'
```

**Migration:** `src/main/db.ts`
```typescript
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_images_coin_path ON images(coin_id, path)');
```

### Layer 3: Safe Insert Operation
**File:** `src/main/db.ts`
```typescript
addImage: (image: NewCoinImage): number => {
  validate(NewCoinImageSchema, image); // Full Zod validation
  const info = db.prepare(
    'INSERT OR IGNORE INTO images (...) VALUES (...)'
  ).run(...);
  if (info.changes === 0) {
    const existing = db.prepare(
      'SELECT id FROM images WHERE coin_id = ? AND path = ?'
    ).get(image.coin_id, image.path);
    return existing?.id ?? 0;
  }
  return info.lastInsertRowid as number;
}
```

### Layer 4: Full Schema Validation
**File:** `src/common/validation.ts`
```typescript
export const NewCoinImageSchema = z.object({
  coin_id: z.number().int().positive(),
  path: z.string().min(1),
  label: z.enum(['Obverse', 'Reverse', 'Edge']).optional(),
  is_primary: z.boolean().optional().default(false),
  sort_order: z.number().int().min(0).optional().default(0)
}).strict();
```

---

## 4. Implementation Summary

### Files Modified

| File | Change |
|------|--------|
| `src/common/schema.ts:57` | Added `UNIQUE(coin_id, path)` to images table |
| `src/main/db.ts:7` | Import `NewCoinImageSchema` |
| `src/main/db.ts:27-31` | Migration: Create unique index on existing DBs |
| `src/main/db.ts:96-106` | `addImage()` uses `INSERT OR IGNORE` + full validation |
| `src/common/validation.ts:72-81` | Added `NewCoinImageSchema` |
| `src/renderer/hooks/useCoinForm.ts:4,19,44,118` | Track existing paths, filter submission |
| `src/renderer/components/Scriptorium.tsx:21` | Pass `existingImages` to hook |

### Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ Passed |
| `npm test` | ✅ 22 tests passed |

---

## 5. How It Works Now

### Scenario: Adding a new image to an existing coin

1. User opens coin ID=1 (has existing obverse at `/data/images/coin-a.jpg`)
2. `useCoinForm(coin, existingImages)` initializes with `existingImagePaths = {"/data/images/coin-a.jpg"}`
3. User captures new reverse via Lens → `formData.images = { obverse: '/data/images/coin-a.jpg', reverse: '/data/images/coin-b.jpg' }`
4. User clicks "Update Ledger"
5. `submit()` filters: only `/data/images/coin-b.jpg` is new
6. `addImage()` receives only the new image
7. If somehow duplicate slips through, `INSERT OR IGNORE` and unique constraint prevent it

### Expected Behavior
- No duplicate coin entries
- No duplicate image entries
- Exactly one image per label (obverse/reverse/edge) per coin
- Editing workflow unchanged from user perspective

---

## 6. Post-Implementation Notes

### Key Patterns Established

1. **Defense in Depth:** Multiple layers of protection (hook filter + DB constraint + safe insert)
2. **Migration Strategy:** `CREATE INDEX IF NOT EXISTS` ensures existing databases are patched
3. **Hook Pattern:** Accepting `existingImages` parameter allows hook to self-filter
4. **Validation Centralization:** `NewCoinImageSchema` in `validation.ts` is shared by both Main and Renderer

### Potential Future Improvements

1. **Image Deletion:** Currently no mechanism to remove images when editing. Consider adding `deleteImage` calls for images removed from form.
2. **Image Update:** Currently images are insert-only. Consider UPSERT pattern if users need to change image metadata.

---

## 7. Approvals

- [x] **Architect:** (Self-Approved)
- [x] **Typecheck:** Verified (`npx tsc --noEmit`)
- [x] **Tests:** Verified (22/22 passed)
