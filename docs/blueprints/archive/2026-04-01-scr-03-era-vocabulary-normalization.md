# Implementation Blueprint: SCR-03 · Era Vocabulary Normalization

**Date:** 2026-04-01
**Status:** Completed
**Reference:** SCR-01 §11 numismatic re-audit — free-text era creates case-variant divergence; vocabulary usage increment not wired for any field

---

## 1. Objective

Two independent defects prevent the vocabulary system from functioning correctly:

**N-01 — `incrementUsage` never fires (all vocab fields):** When a collector selects an existing option from any `AutocompleteField` (era, metal, denomination, grade, die_axis, mint, rarity), `incrementUsage` is never called. The vocabulary hook exposes `incrementUsage` but `AutocompleteField.tsx` does not invoke it in its `selectOption` handler. As a result, `usage_count` for all vocabulary entries stays frozen at seed values across the entire app lifetime — the autocomplete never learns from collector behaviour, and popular terms never rise to the top of suggestions. `docs/reference/vocabulary-system.md` incorrectly documents this as already working.

**N-02 — Case-sensitive filter matching (era, metal, grade):** `useCoins.ts` uses `Array.prototype.includes` for all three filter groups — strict equality, case-sensitive. A collector who types `"roman imperial"` creates a database entry that will never match the sidebar checkbox labelled `"Roman Imperial"`. Both appear as separate `availableEras` entries. This is the specific UX defect flagged in the SCR-01 §11 numismatic re-audit.

| ID | Severity | Description |
|----|----------|-------------|
| N-01 | 🔴 Critical | `incrementUsage` never called — vocabulary learning non-functional for all 7 fields |
| N-02 | 🟠 High | Filter matching is case-sensitive — case-variant entries do not merge in sidebar |

**Backlog items flagged during SCR-03 audits (out of scope for this sprint):**

| ID | Severity | Description | Scope |
|----|----------|-------------|-------|
| N-03 | 🟡 Medium | Seed gap — "Greek / Hellenistic", "Celtic", "Sasanian / Persian" absent; bare "Medieval" creates taxonomy trap | DB-only |
| N-04 | 🟡 Medium | `incrementVocabUsage` UPDATE has no locale filter — EN selections increment ES rows for identical-spelling terms | Cross-process |

See [Section 11](#11-backlog-items-flagged-by-scr-03-audits) for technical strategy and verification details.

### Philosophical Alignment

- [x] **Archival Ledger Aesthetic:** No UI surface changes. Autocomplete suggestions silently re-order over time as usage data accumulates — an unobtrusive improvement that rewards collectors who build large collections.
- [x] **Privacy First:** No external resources. N-01 is component-prop and hook wiring only; N-02 is a one-line filter change per filter group. All renderer-only.
- [x] **Single-Click Rule:** No new navigation, no new surfaces.

---

## 2. Technical Strategy

### 2.1 N-01 — Wire `incrementUsage` in `AutocompleteField`

**Root cause:** `AutocompleteField.tsx` `selectOption` handler (lines 65–72) calls `onChange(value)` to update the parent form but does not invoke any usage increment. LedgerForm already passes the vocabulary hook's `incrementUsage` function nowhere — there is no prop for it.

**File: `src/renderer/components/AutocompleteField.tsx`**

Add an optional `onIncrementUsage?: (value: string) => void` prop. Call it from `selectOption` only when an existing option is chosen (not from `handleAddNew` — new entries start at `usage_count=0` and must not be incremented on first add):

```typescript
interface AutocompleteFieldProps {
  // ... existing props
  onIncrementUsage?: (value: string) => void;
}

// In selectOption (existing handler, add one line):
const selectOption = useCallback((value: string) => {
  onChange(value);
  onIncrementUsage?.(value);   // optional call — fire-and-forget, no await
  setQuery('');
  setIsOpen(false);
}, [onChange, onIncrementUsage]);
```

The prop is optional (`?`): any `AutocompleteField` usage outside of `LedgerForm` (e.g. future search surfaces) requires no changes and will silently skip the increment.

**Implementation note — pseudocode variable names:** The pseudocode above uses `setQuery('')` and `setIsOpen(false)` for illustration. The actual `AutocompleteField.tsx` component uses `setInputValue(optionValue)` and `close()`. Implementers must insert `onIncrementUsage?.(value)` into the **existing** `selectOption` body — between the `onChange` call and `setInputValue` — not replace the handler with the listing above.

**Re-ordering timing:** Because `incrementUsage` fires without clearing the vocabulary cache, the `options` array for the current component mount is never updated. Suggestion re-ordering becomes visible only on the **next cache miss** — after navigating away and back to `LedgerForm`, or after app restart. This is intentional: options must not jump mid-form-fill. Do not treat the absence of immediate re-ordering as a bug.

**File: `src/renderer/components/LedgerForm.tsx`**

Pass `onIncrementUsage` to all seven `AutocompleteField` instances. Each vocabulary hook already exposes `incrementUsage: (value: string) => void` — no new hook calls needed:

```tsx
// era
<AutocompleteField ... onIncrementUsage={eraVocab.incrementUsage} />

// mint
<AutocompleteField ... onIncrementUsage={mintVocab.incrementUsage} />

// denomination
<AutocompleteField ... onIncrementUsage={denominationVocab.incrementUsage} />

// metal
<AutocompleteField ... onIncrementUsage={metalVocab.incrementUsage} />

// die_axis
<AutocompleteField ... onIncrementUsage={dieAxisVocab.incrementUsage} />

// grade
<AutocompleteField ... onIncrementUsage={gradeVocab.incrementUsage} />

// rarity
<AutocompleteField ... onIncrementUsage={rarityVocab.incrementUsage} />
```

**File: `docs/reference/vocabulary-system.md`**

Correct the documentation claim that `AutocompleteField` calls `incrementVocabUsage` automatically. Update to reflect that the increment fires via the `onIncrementUsage` prop injected by `LedgerForm`.

---

### 2.2 N-02 — Case-insensitive filter matching

**Root cause:** `useCoins.ts` lines 48–60 use `filters.era.includes(coin.era)` and equivalent patterns for metal and grade. `Array.prototype.includes` performs strict (`===`) string comparison.

Apply case-insensitive matching across all three filter groups for consistency:

```typescript
// Era filter (replace lines 48–50):
if (filters.era.length > 0) {
  result = result.filter(coin =>
    coin.era != null &&
    filters.era.some(f => f.toLowerCase() === coin.era!.toLowerCase())
  );
}

// Metal filter (replace lines 53–55):
if (filters.metal.length > 0) {
  result = result.filter(coin =>
    coin.metal != null &&
    filters.metal.some(f => f.toLowerCase() === coin.metal!.toLowerCase())
  );
}

// Grade filter (replace lines 58–60):
if (filters.grade.length > 0) {
  result = result.filter(coin =>
    coin.grade != null &&
    filters.grade.some(f => f.toLowerCase() === coin.grade!.toLowerCase())
  );
}
```

**Sidebar behaviour after this change:** `availableEras` is derived from raw stored values (`coins[].era`). If a collector has both `"roman imperial"` and `"Roman Imperial"` in their data, both will appear as distinct checkboxes. Selecting either checkbox will now match both coins. This is correct — the sidebar truthfully reflects what is stored; the filter just matches generously. A future data hygiene sprint (`SCR-04`) could consolidate divergent entries.

---

## 3. Verification Strategy

### Test Cases

**`AutocompleteField.test.tsx`** — extend existing (currently has TC-AC-01 through TC-AC-26):

1. **N-01:** Render with `onIncrementUsage={vi.fn()}`. Simulate selecting an existing option. Assert spy called once with the selected value.
2. **N-01:** Render with `onIncrementUsage={vi.fn()}`. Trigger `onAddNew` flow (add a new entry). Assert spy NOT called — increment must not fire on first-add.
3. **N-01:** Render without `onIncrementUsage` prop. Select an existing option. Assert no error thrown (prop is optional; optional chaining `?.` must not throw).

**`useCoins.test.ts`** — extend existing:

4. **N-02 era:** Seed MOCK_COINS with one coin `era: 'ancient'` (lowercase) and one `era: 'Ancient'` (titlecase). Apply era filter `['Ancient']`. Assert both coins appear in `filteredCoins`.
5. **N-02 metal:** Seed with `metal: 'silver'` and `metal: 'Silver'`. Apply metal filter `['Silver']`. Assert both match.
6. **N-02 grade:** Seed with `grade: 'xf'` and `grade: 'XF'`. Apply grade filter `['XF']`. Assert both match.

**`LedgerForm.test.tsx`** — extend existing:

7. **N-01:** Render form. Confirm the era `AutocompleteField` receives an `onIncrementUsage` function prop (not `undefined`). Repeat spot-check for metal.

### Colocation Check
- `AutocompleteField.test.tsx` → `src/renderer/components/AutocompleteField.test.tsx` (extends existing)
- `useCoins.test.ts` → `src/renderer/hooks/__tests__/useCoins.test.ts` (extends existing)
- `LedgerForm.test.tsx` → `src/renderer/components/__tests__/LedgerForm.test.tsx` (extends existing)

### Mocking Strategy
- `window.electronAPI.incrementVocabUsage` must be confirmed in `setupTests.ts` global mock — verify it is present (not just `addVocab` and `getVocab`).
- N-01 `AutocompleteField` tests: pass `onIncrementUsage={vi.fn()}` directly — no IPC layer involved.
- N-02 `useCoins` tests: extend `MOCK_COINS` fixture with case-variant entries; existing mock pattern applies.

---

## 4. Architectural Oversight (`curating-blueprints`)

**Status:** Complete — PASS

### Audit Findings:

**Process boundary integrity (N-01): PASS.** N-01 touches only the renderer process. `window.electronAPI.incrementVocabUsage` is already defined in `preload.ts` (line 38) and validated by `VocabIncrementSchema` at the IPC boundary. No new `contextBridge` exposures, no new handlers in `src/main/index.ts`, no schema changes. The prop injection pattern (`onIncrementUsage`) is correctly layered: the hook owns the IPC call, the component is passed a typed callback — business logic stays out of the Electron bridge.

**Process boundary integrity (N-02): PASS.** N-02 is a pure `useMemo` predicate change in `useCoins.ts`. No IPC, no cross-process surface, no new types required. `toLowerCase()` on both sides of the comparison is a non-destructive in-memory operation — no data is written or mutated.

**Abstraction layer correctness: PASS.** The `incrementUsage` call lives in `useVocabularies` (hook layer, lines 76–81), is injected into `AutocompleteField` via an optional prop typed as `(value: string) => void`, and is called fire-and-forget with optional chaining (`?.`). The component has no knowledge of IPC or SQLite — it remains a pure UI element. This is the correct layering pattern for the project.

**`src/common/` cross-process consistency: PASS.** `VocabIncrementSchema` (the only shared validation schema touched by this sprint) is unchanged for N-01 and N-02. The `Coin` and `CoinImage` domain types in `src/common/types.ts` are unaffected. No cross-process type drift is introduced.

**Backlog items (N-03 and N-04) architectural assessment:**
- **N-03** (seed gap) is correctly scoped as DB-only. Bumping `CURRENT_SEED_VERSION` is the established pattern. No cross-process risk.
- **N-04** (locale bug) is correctly scoped as cross-process. The proposed changes — adding `locale` to `VocabIncrementSchema`, threading it through the IPC handler, DB method, preload bridge, type declaration, and `useVocabularies` — follow The Filter and The Bridge patterns correctly. The `z.enum(['en', 'es'])` constraint mirrors the existing `VocabGetSchema` approach. This is the correct architectural approach for a future sprint.

### Review Notes & Suggestions:

- The N-04 backlog item in Section 11.2 correctly places the locale enum in `VocabIncrementSchema` rather than hardcoding it in the DB method — this keeps The Filter as the sole validation gate, consistent with all other IPC handlers. Confirm that `useLanguage` is already imported in `useVocabularies.ts` before the N-04 sprint begins (the blueprint notes this as a confirmation step, which is the correct approach).
- No architectural issues found. Safe to proceed to Phase III user review.

---

## 5. Security Assessment (`securing-electron`)

**Status:** Complete — PASS

### Audit Findings:

**RESULT: PASS — No security concerns. Safe to proceed.**

#### N-01: `onIncrementUsage` prop — attacker-controlled value path

- **Is `value` attacker-controlled?** Partially. The `value` passed to `onIncrementUsage` comes from `selectOption(optionValue)`, where `optionValue` is drawn directly from the `filteredOptions` array — a subset of `options` passed in by the parent (`LedgerForm`). Those options originate from `useVocabularies`, which fetches them from the local SQLite `vocabularies` table via `window.electronAPI.getVocab`. A collector could in theory craft an unusual string value by first adding it via `vocab:add`, but this is a local, authenticated context (no remote attacker surface). The renderer is sandboxed (`contextIsolation: true`, `sandbox: true`), and any value that reached the options list has already been validated through `VocabAddSchema` (enforces `min(1)`, `max(200)`, and the `[\p{L}\p{N}\s\-'().,:&]+` regex). There is no free-text injection path through `selectOption` — it only fires for items already in the rendered list.

- **Does it pass through Zod validation at the IPC boundary?** Yes. `window.electronAPI.incrementVocabUsage(field, value)` invokes `ipcRenderer.invoke('vocab:increment', { field, value })`. The Main-process handler (`src/main/index.ts` line 229) calls `validateIpc(VocabIncrementSchema, data)` before any DB access. `VocabIncrementSchema` (defined at `src/common/validation.ts` line 150) requires:
  - `field`: `z.enum(ALLOWED_VOCAB_FIELDS)` — rejects any field not in the seven-item allowlist
  - `value`: `z.string().min(1).max(200)` — rejects empty strings and over-length values
  - `.strict()` — rejects any extra properties

  `validateIpc` throws on any parse failure, aborting execution before the SQL statement runs. **The Filter is enforced.**

- **Does `incrementVocabularyUsage` add a second field check?** Yes (`src/main/db.ts` line 344): `if (!ALLOWED_VOCAB_FIELDS.includes(field)) throw new Error(...)`. This is defence-in-depth — the Zod gate upstream already blocks invalid fields, so this guard is redundant but not harmful.

- **SQL injection concern?** None. The `UPDATE vocabularies SET usage_count = usage_count + 1 WHERE field = ? AND value = ?` statement uses positional `?` parameters via `better-sqlite3`'s prepared statements. No string interpolation.

#### N-02: Case-insensitive filter — `f.toLowerCase() === coin.era!.toLowerCase()`

- **Injection concern?** None. This is a pure in-memory JavaScript comparison between two strings that have already been read from the local SQLite DB (stored values) and the renderer's own filter state (values the collector checked in the UI). Both are plain application strings — not HTML, SQL, or shell input. `toLowerCase()` is a non-destructive Unicode-safe string method that cannot produce an injection vector. No DOM mutation, no IPC call, and no SQL interaction occurs in the filter derivation. The `!` non-null assertion is protected by the explicit `coin.era != null` guard immediately before it.

#### Sandbox / contextIsolation integrity

- No new `contextBridge` exposures. `incrementVocabUsage` already appears in `preload.ts` line 38.
- No new IPC channels registered.
- No changes to `patina-img://` protocol or any file-system access pattern.
- `contextIsolation: true` and `sandbox: true` are unaffected.

### Review Notes & Suggestions:

- The `VocabIncrementSchema` value constraint (`min(1)`, `max(200)`) is slightly looser than `VocabAddSchema` (which additionally enforces the character-allowlist regex). This asymmetry is acceptable — `vocab:increment` only updates a `usage_count` counter and performs no write to the `value` column. A value that passes `min(1)/max(200)` but contains unusual characters will simply match zero rows in the `UPDATE` (a silent no-op), causing no data corruption.
- No remediation required before implementation.

---

## 6. Quality Assessment (`assuring-quality`)

**Status:** PASS (with one implementation constraint — see item 2)

### Audit Findings:

1. **`incrementVocabUsage` in `setupTests.ts`:** Confirmed present at line 53 (`incrementVocabUsage: vi.fn().mockResolvedValue(undefined)`). Not a blocking gap.

2. **MOCK_COINS fixture conflict (implementation constraint):** The module-level `MOCK_COINS` array in `useCoins.test.ts` is shared across all tests. Two existing assertions depend on its exact composition:
   - `availableEras` asserts `['Ancient', 'Medieval']`
   - `availableGrades` asserts `['Choice VF', 'XF']`

   If N-02 tests 4–6 add case-variant coins (e.g. `era: 'ancient'`, `grade: 'xf'`) to the shared `MOCK_COINS` array, these existing assertions will break. **Implementation constraint:** tests 4–6 must use per-test `mockResolvedValue` overrides with a locally-extended array inside the N-02 `describe` block — they must not mutate the shared `MOCK_COINS` fixture.

3. **`handleAddNew` vs `selectOption` separation:** No special consideration is required for test case 2. `handleAddNew` (AutocompleteField.tsx lines 74–82) is a fully independent function from `selectOption` (lines 65–72) and never calls it. An `onIncrementUsage` call added inside `selectOption` cannot be triggered by the add-new path. Test case 2 is straightforward.

4. **Keyboard path coverage:** `selectOption` is also invoked via keyboard Enter (handleKeyDown line 131). Since `onIncrementUsage` would live inside `selectOption`, the increment fires for both mouse and keyboard selection with no additional test case needed — existing TC-AC-18 already validates the Enter→`selectOption` route.

5. **Coverage mandate:** 26 existing AutocompleteField tests + 3 = 29. The N-01 change adds one optional prop and one optional-chained call — approximately 2 lines of new code. Three test cases cover all branches (spy called on select, spy not called on add-new, no-throw when prop is absent). The 80% statement mandate is maintained.

6. **Incidental coverage gain:** There is no existing baseline metal filter test in `useCoins.test.ts`. N-02 test 5 will be the first test exercising the metal filter path — a positive side-effect of this sprint.

### Review Notes & Suggestions:
- Implement N-02 tests 4–6 with local `mockResolvedValue` overrides rather than modifying the shared `MOCK_COINS` fixture. This is a required constraint, not a suggestion.

---

## 7. UI Assessment (`curating-ui`)

**Status:** PASS

### Audit Findings:

**N-01 — No re-render flicker or layout shift (PASS)**

`incrementUsage` in `useVocabularies.ts` (lines 76–81) is a true fire-and-forget: it calls `window.electronAPI.incrementVocabUsage` and returns void. It does not call `clearVocabCache()` or `fetchOptions()`, so no state update is queued and no React re-render occurs at the point of selection. Compare with `addVocabulary` (lines 67–73), which does both. The parent `AutocompleteField` already closes and clears `inputValue` synchronously via `selectOption`; the IPC call is invisible to the user. No flicker or layout shift risk.

**N-02 — `availableEras` sidebar rendering unaffected (PASS)**

`availableEras` is derived in `useCoins.ts` lines 115–119 from the raw `coins[]` array via a `useMemo` with a `Set`, independent of the filter predicates. N-02 only modifies the `filteredCoins` predicate (the `.some(f => f.toLowerCase() === ...)` pattern). Sidebar checkboxes continue to reflect all distinct stored values as before. If a collector has both `"roman imperial"` and `"Roman Imperial"` in their data, both checkboxes still appear — this is correct and intentional per Section 2.2. No sidebar rendering change.

**Re-ordering timing — clarification required (NOTE)**

The blueprint states (Section 1, Philosophical Alignment) that "autocomplete suggestions silently re-order over time." This is accurate but imprecise in a way that matters for implementers. Because `incrementUsage` fires without clearing the vocab cache, the in-memory `options` array for the current component mount is never updated. Re-ordering only becomes visible when the cache entry for that field is next cold-loaded — specifically, after navigating away and back to `LedgerForm`, or after a full app restart. Re-ordering does **not** happen on the next dropdown open within the same form session. This is good UX (options do not jump mid-form-fill), but implementers must not treat a missing live re-order as a bug.

**N-01 pseudocode shape divergence — minor implementation note**

The blueprint's `selectOption` pseudocode (Section 2.1) uses `setQuery('')` and `setIsOpen(false)`, which do not exist in the real component. The actual implementation uses `setInputValue(optionValue)` and `close()`. The pseudocode is illustrative only. Implementers must insert `onIncrementUsage?.(value)` into the existing `selectOption` body in `AutocompleteField.tsx` — between `onChange(optionValue)` and `setInputValue(optionValue)` — rather than replacing the handler with the blueprint listing.

**Accessibility — no concern (PASS)**

`onIncrementUsage` is an optional internal callback. It introduces no new DOM nodes, no ARIA attributes, and no role changes. The existing combobox/listbox/option pattern is untouched. Touch targets for existing `autocomplete-option` items (0.6rem top/bottom padding at 1rem font-size) meet the 44px minimum on all target viewports.

**CSS — no changes required (PASS)**

No new CSS classes are needed. The autocomplete dropdown styles in `index.css` (lines 1892–2029) are unchanged. N-01 and N-02 are entirely logic-layer changes.

### Review Notes & Suggestions:
- Add one sentence to Section 2.1 clarifying that suggestion re-ordering is deferred to the next cache miss (next navigation to `LedgerForm`), not immediate, and that this is intentional — it prevents mid-session option list jumps.
- Verify the implementer inserts `onIncrementUsage?.(value)` into the **actual** `selectOption` body rather than replacing it with the blueprint's pseudocode snippet.

---

## 8. Numismatic & UX Assessment (`curating-coins`)

**Status:** PASS with findings

### Verdict

Both defects (N-01 and N-02) are legitimate and correctly scoped. The fixes are appropriate. Several findings below require attention before the sprint closes, and the three open questions are answered.

---

### Finding 1 — Seeded era vocabulary: PASS with gaps

The eleven English era values cover the core Roman collecting spectrum well. The Roman Republic / Roman Imperial / Roman Provincial / Byzantine sequence is the backbone of classical numismatics and is correctly seeded. "Islamic" and "Byzantine" address two distinct and active collector communities. "Modern" functions as a valid catch-all for post-1500 coinage.

**Concern A — "Medieval" is redundant and creates a taxonomy trap.** The list contains both "Medieval" (usage_count 10) and three period-specific subdivisions: "Early Medieval", "High Medieval", "Late Medieval". A collector who picks "Medieval" for a coin will not see it when filtering by "Early Medieval", and vice versa. The bare term carries the lowest usage_count in the group (10), suggesting it was added as a fallback, but its presence will confuse rather than help. Recommendation: either remove "Medieval" and document the three subdivisions as the canonical choices, or re-designate it explicitly as a catch-all for coins that cannot be period-dated more precisely, with tooltip guidance to that effect. The same redundancy exists in Spanish ("Medieval" at 10 alongside Alta/Plena/Baja Edad Media).

**Concern B — Missing major collecting categories.** No "Greek / Hellenistic" era is seeded. Greek and Hellenistic coinage is one of the three largest collecting categories globally (alongside Roman Imperial and Medieval), and omitting it means a first-time collector of Athenian owls or Ptolemaic bronzes must free-type the value immediately. No "Celtic" or "Sasanian / Persian" entry is present either. These are additive omissions (add seed rows, bump `CURRENT_SEED_VERSION`) and are not blocking for this sprint, but should be tracked as a follow-on seed-data ticket.

---

### Finding 2 — N-01 usage-based sorting: PASS

Sorting autocomplete suggestions by `usage_count DESC, value ASC` is the correct default for a personal collection tool. A collector who predominantly enters Roman Imperial coins will see that option surface first within a few sessions — genuine friction reduction with zero visual footprint. The secondary `value ASC` tie-break ensures a deterministic, alphabetically predictable order for options that share a usage level, which is important for seed values that happen to share the same count (e.g., "Ancient" and "Byzantine" are both seeded at 30).

No concern about high-usage terms crowding out less common but important era labels. Unlike a shared platform where popular terms could overwhelm a minority collector's vocabulary, this is a single-user local database. The usage signal is entirely the collector's own. A specialist in Byzantine coins will see Byzantine terms rise; a Roman Republican specialist will see Republican terms rise. This is personalisation, not pollution. The full list remains available for typed search at all times.

---

### Finding 3 — N-02 scope (metal and grade): apply to all three filter groups

**Metal:** Metal values are entered via autocomplete from a well-controlled seed list, but collectors may type new values freely. A collector entering "silver" or "SILVER" should not see their coin silently excluded from a "Silver" filter. Case drift is low-probability but the consequence is an invisible data exclusion. Apply the fix.

**Grade:** PCGS-standard grade abbreviations ("EF-45", "VF-30") are all-uppercase and derive from a closed seed list. Case drift is essentially zero for standardised grades. However, applying the same `toLowerCase()` fix to grade costs nothing, makes filter behaviour consistent across all three groups, and future-proofs against any user-added informal grade strings. Apply the fix.

**Recommendation: N-02 should apply to all three filter groups as proposed in the blueprint.** The blueprint's code examples already do this correctly — this is a confirmation, not a scope change.

---

### Finding 4 — Write-time Title Case normalisation: do not implement

Title Case normalisation at write time is inappropriate for numismatic period names. Specific failure cases under any standard JS Title Case implementation:

- "3rd Century AD" normalises to "3Rd Century Ad" — the ordinal suffix and era abbreviation are corrupted.
- "BC" / "AD" suffixes become "Bc" / "Ad".
- Hyphenated terms ("post-Augustan"): handling varies across libraries and is not predictable.
- European names with particles: a collector entering a provenance-linked custom era such as "de la Gardie Period" would receive "De La Gardie Period".

Case-insensitive matching (N-02) solves the filter divergence problem without touching stored data. Write-time normalisation adds fragility for no additional collector benefit. **Do not implement.**

---

### Finding 5 — SCR-04 data hygiene sprint: not recommended

Case-insensitive filter matching (N-02) resolves the core UX problem: divergent-cased entries will all match a filter selection regardless of how they were stored. The sidebar will still show "roman imperial" and "Roman Imperial" as separate checkboxes if both exist — this is an honest representation of stored data, not a defect.

Normalising existing data in SCR-04 carries real risk: collector-entered values may be intentional. A collector who typed "roman provincial" as an informal label distinct from the canonical "Roman Provincial" would have their data silently overwritten, violating the archival ledger philosophy. **SCR-04 is not worth pursuing. N-02 is sufficient.**

---

### Finding 6 — Latent locale bug in `incrementVocabUsage` (out of scope, flag for backlog)

`db.ts` line 348 runs `UPDATE vocabularies SET usage_count = usage_count + 1 WHERE field = ? AND value = ?` with no locale column in the WHERE clause. Terms that exist in both EN and ES seeds with identical spellings ("Medieval", "Billon", "Tumbaga", "Lugdunum") will have both locale rows incremented when an EN-locale collector selects them. ES `usage_count` drifts for a collector who has never used the Spanish UI.

This bug pre-exists SCR-03 and is not a regression introduced here. It has no user-visible consequence unless the collector switches locales. Flag for a future DB maintenance ticket. Suggested fix: add `AND locale = ?` to the UPDATE statement and thread the active locale from the renderer through the IPC call.

---

### Open Question Answers

**OQ-1 (N-02 scope — metal and grade):** Apply to all three filter groups. See Finding 3.

**OQ-2 (Write-time Title Case normalisation):** Do not implement. See Finding 4.

**OQ-3 (`vocabulary-system.md` correction scope):** Minimal correction is sufficient for this sprint. Fix the one false claim (that `AutocompleteField` handles `incrementVocabUsage` automatically) and add a single paragraph documenting the `onIncrementUsage` prop as the canonical wiring pattern. A full accuracy review of the document is out of scope.

---

## 9. User Consultation & Decisions

### Open Questions:

1. **N-02 scope — metal and grade:** Metal values come from seed data ("Silver", "Gold") and are rendered UPPERCASE in the sidebar display-only span. Grade values ("XF", "VF-30") are PCGS standardised abbreviations. Case drift is unlikely for these fields since collectors select from well-formed suggestions. Should N-02 be era-only, or applied consistently to all three filter groups?

2. **Write-time normalisation:** Should new era values be normalised to Title Case at write time (in `updateField` or `useCoinForm` submit)? This would prevent future divergence at the cost of potentially surprising the collector (they type "roman imperial", it saves as "Roman Imperial"). Or is case-insensitive filter matching alone sufficient?

3. **`docs/reference/vocabulary-system.md` correction scope:** The doc claims AutocompleteField handles incrementUsage automatically. Should the correction be minimal (fix the one incorrect sentence) or a full accuracy review of the document?

### Final Decisions:

**Q1 — N-02 scope (confirmed by user, 2026-04-03):** Apply case-insensitive matching to all three filter groups (era, metal, grade). The blueprint code already implements this correctly.

**Q2 — Write-time Title Case normalisation (confirmed by user, 2026-04-03):** Do not implement. Case-insensitive filter matching is sufficient; Title Case normalisation corrupts ordinal suffixes, era abbreviations, and European name particles.

**Q3 — `vocabulary-system.md` correction scope (overridden by user, 2026-04-03):** Full accuracy review of `docs/reference/vocabulary-system.md` is in scope for this sprint — not just the one false claim. Correct all inaccurate statements and bring the document fully in line with the implemented system.

**Era filter expand behaviour (noted by user, 2026-04-03):** The user requested that the era filter show max 8 values with an expand option, like metals and grades. Confirmed already implemented: `PatinaSidebar.tsx` applies `renderOverflowGroup` with `TRUNCATION_THRESHOLD = 8` to all three filter groups identically. No implementation work required.

---

## 10. Post-Implementation Retrospective

**Date:** 2026-04-03
**Outcome:** Complete — all 79 tests pass, zero TypeScript errors.

### Summary of Work

- **N-01:** Added `onIncrementUsage?: (value: string) => void` prop to `AutocompleteField`; called via optional chaining inside `selectOption` (not `handleAddNew`). Wired all 7 `AutocompleteField` instances in `LedgerForm` (era, mint, denomination, metal, die_axis (×2 — main + accordion), grade, rarity). Added TC-AC-27/28/29 to `AutocompleteField.test.tsx` and two integration spot-checks to `LedgerForm.test.tsx`.
- **N-02:** Replaced `Array.prototype.includes` with `Array.prototype.some` + `toLowerCase()` on both sides for era, metal, and grade filters in `useCoins.ts`. Added N-02 describe block (3 tests) to `useCoins.test.ts` using per-test `mockResolvedValue` overrides to avoid mutating the shared `MOCK_COINS` fixture.
- **Docs:** Updated `docs/reference/vocabulary-system.md` — added `rarity` to the allowed fields table, corrected the Component Pattern section (accurate hook return type, accurate `AutocompleteField` props), replaced the false claim that the component auto-calls `incrementVocabUsage` with the correct `onIncrementUsage` prop pattern.

### Pain Points

- The LedgerForm N-01 integration tests required two non-obvious patterns: (1) `clearVocabCache()` in the describe-scoped `beforeEach` to prevent the module-level cache from serving empty arrays from previous tests, and (2) `within(field.closest('.autocomplete-field'))` to scope option queries — all 7 dropdowns render their options in the DOM simultaneously, so plain `getByRole('option', { name })` finds multiple elements and throws. The blueprint did not call out these patterns; they emerged from test execution.
- `act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); })` was needed to flush the async `getVocab` call before opening the dropdown. Clicking before the promise resolves gives an empty dropdown.

### Things to Consider
- After N-01 lands, `usage_count` values will begin diverging from seed values as collectors use the app. If a future data migration or seed reset is needed, `CURRENT_SEED_VERSION` bump restores seed `usage_count` values but preserves user-added entries — confirm this is the desired reset behaviour.
- `CURRENT_SEED_VERSION` bump is **not required** for this sprint — no new seed data is added. All 7 vocabulary fields (including era) already have seed entries.
- **SCR-04 data hygiene sprint: not recommended.** N-02 case-insensitive matching resolves the filter problem without touching stored data. Rewriting divergent era values risks overwriting intentional collector input. (`curating-coins` Finding 5)
- **N-03 (seed gap — follow-on ticket):** No "Greek / Hellenistic" era is seeded — one of the three largest global collecting categories. "Celtic" and "Sasanian / Persian" are also absent. Bare "Medieval" coexists with "Early Medieval" / "High Medieval" / "Late Medieval", creating a taxonomy trap. DB-only fix: add seed rows, remove bare "Medieval", bump `CURRENT_SEED_VERSION`. See [Section 11.1](#111-n-03--seed-gap-missing-era-vocabulary-entries) for full strategy. (`curating-coins` Finding 1)
- **N-04 (locale bug — DB maintenance backlog):** `db.ts` `UPDATE` statement has no locale column in the WHERE clause — selecting "Medieval" in EN also increments the ES row. No user-visible consequence unless the collector switches locales. Cross-process fix: `VocabIncrementSchema` gains a `locale` field, IPC handler and preload bridge updated, `useVocabularies` threads active language through. See [Section 11.2](#112-n-04--locale-bug-incrementvocabusage-missing-locale-filter) for full strategy. (`curating-coins` Finding 6)
- **Core Doc Revision:** Update `docs/reference/vocabulary-system.md` to correct the false claim that AutocompleteField handles `incrementVocabUsage` automatically. Add a paragraph documenting the `onIncrementUsage` prop as the canonical wiring pattern.

---

## 11. Backlog Items (Flagged by SCR-03 Audits)

These items were identified during SCR-03 Phase II audits and are explicitly out of scope for this sprint. They are self-contained and can be implemented independently.

---

### 11.1 N-03 — Seed Gap: Missing Era Vocabulary Entries

**Source:** `curating-coins` Finding 1
**Scope:** DB-only. No cross-process schema change, no IPC changes.

**Root Cause:**
The era vocabulary seed in `src/main/db.ts` (`getSeedEntries()`) is missing three major collecting categories:

- **"Greek / Hellenistic"** — one of the three largest global collecting categories (Athenian owls, Ptolemaic bronzes, Seleucid and Ptolemaic issues). Collectors of these coins must free-type the value on first entry.
- **"Celtic"** — a distinct and actively collected tradition, entirely absent.
- **"Sasanian / Persian"** — pre-Islamic Persian coinage, separate from the "Islamic" entry already seeded.

Additionally, bare `"Medieval"` (EN, `usage_count: 10`) and `"Medieval"` (ES, `usage_count: 10`) coexist with three period subdivisions (`"Early Medieval"` / `"High Medieval"` / `"Late Medieval"` and their ES equivalents). This creates a taxonomy trap: a coin tagged `"Medieval"` will never appear when a collector filters by `"Early Medieval"`, and vice versa.

**Current seed state (lines 93–116 of `src/main/db.ts`):**
- 11 EN era entries, 11 ES era entries
- Bare "Medieval" present in both locales at `usage_count: 10`
- No "Greek / Hellenistic", "Celtic", or "Sasanian / Persian" in either locale

**File: `src/main/db.ts`**

1. **Remove** the bare `"Medieval"` / `"Medieval"` entries from both EN and ES. The three period subdivisions are canonical; a bare catch-all adds confusion rather than value.
2. **Add** the following new EN era entries to `getSeedEntries()`:

```typescript
{ field: 'era', value: 'Greek / Hellenistic', locale: en, usage_count: 35 },
{ field: 'era', value: 'Celtic',              locale: en, usage_count: 10 },
{ field: 'era', value: 'Sasanian / Persian',  locale: en, usage_count: 8  },
```

3. **Add** their ES equivalents:

```typescript
{ field: 'era', value: 'Griego / Helenístico', locale: es, usage_count: 35 },
{ field: 'era', value: 'Celta',                locale: es, usage_count: 10 },
{ field: 'era', value: 'Sasánida / Persa',     locale: es, usage_count: 8  },
```

4. **Bump `CURRENT_SEED_VERSION`** (currently `'6c.2'`) to trigger re-seed on next app launch. New entries are inserted via `INSERT OR IGNORE` — user-added vocabulary is preserved. Seed reset updates `usage_count` for built-in entries only; collector data is unaffected.

**Note:** `usage_count` values for new entries are set to plausible non-zero values so they sort reasonably against existing entries at first use. Greek/Hellenistic is seeded at 35 (comparable to "Byzantine" and "Roman Provincial") to reflect its collecting prominence.

**Verification:**

- Unit test on `getSeedEntries()`: assert new entries (`Greek / Hellenistic`, `Celtic`, `Sasanian / Persian`) present in EN and ES output.
- Assert bare `"Medieval"` absent from both EN and ES seed output.
- Integration smoke test (after `seedVocabularies()`): `getVocab('era', 'en')` returns `"Greek / Hellenistic"` and `"Celtic"`.
- Colocation: test extends existing `src/main/__tests__/db.test.ts` (or equivalent seed test file).

---

### 11.2 N-04 — Locale Bug: `incrementVocabUsage` Missing Locale Filter

**Source:** `curating-coins` Finding 6
**Scope:** Cross-process. Touches `src/common/`, `src/main/` (three files), and `src/renderer/`.

**Root Cause:**
`src/main/db.ts` line 348:

```sql
UPDATE vocabularies SET usage_count = usage_count + 1 WHERE field = ? AND value = ?
```

There is no `locale` column in the `WHERE` clause. Terms that exist in both EN and ES seeds with identical spellings — "Medieval", "Billon", "Tumbaga", "Lugdunum" — will have **both** locale rows incremented when an EN-locale collector selects them. ES `usage_count` drifts for collectors who have never opened the Spanish UI.

No user-visible consequence today unless the collector switches locales. The bug is pre-existing and is not a regression from SCR-03.

**Files and changes:**

**1. `src/common/validation.ts` (line 150)**

Add `locale` to `VocabIncrementSchema`. Use the same `z.enum(['en', 'es'])` pattern already established by `VocabGetSchema` (line 147):

```typescript
export const VocabIncrementSchema = z.object({
  field: z.enum(ALLOWED_VOCAB_FIELDS),
  value: z.string().min(1).max(200),
  locale: z.enum(['en', 'es']),
}).strict();
```

**2. `src/main/index.ts` (line 229–232)**

Destructure `locale` from the validated payload and pass it to the DB method:

```typescript
ipcMain.handle('vocab:increment', (_, data: unknown) => {
  const { field, value, locale } = validateIpc(VocabIncrementSchema, data);
  dbService.incrementVocabularyUsage(field, value, locale);
});
```

**3. `src/main/db.ts` (lines 343–350)**

Add `locale` parameter and update the SQL WHERE clause:

```typescript
incrementVocabularyUsage: (field: VocabField, value: string, locale: 'en' | 'es'): void => {
  if (!ALLOWED_VOCAB_FIELDS.includes(field)) {
    throw new Error(`Invalid vocabulary field: ${field}`);
  }
  db.prepare(
    'UPDATE vocabularies SET usage_count = usage_count + 1 WHERE field = ? AND value = ? AND locale = ?'
  ).run(field, value, locale);
},
```

Note: The existing defence-in-depth field guard (line 344) is preserved unchanged.

**4. `src/main/preload.ts` (line 38–39)**

Update bridge signature:

```typescript
incrementVocabUsage: (field: VocabField, value: string, locale: 'en' | 'es'): Promise<void> =>
  ipcRenderer.invoke('vocab:increment', { field, value, locale }),
```

**5. `src/renderer/electron.d.ts` (line 31)**

Update the type declaration to match:

```typescript
incrementVocabUsage: (field: VocabField, value: string, locale: 'en' | 'es') => Promise<void>;
```

**6. `src/renderer/hooks/useVocabularies.ts` (lines 76–81)**

Thread the active locale from `useLanguage()`:

```typescript
const { language } = useLanguage();

const incrementUsage = useCallback(
  (value: string) => {
    window.electronAPI.incrementVocabUsage(field, value, language);
  },
  [field, language],
);
```

`language` is already a stable value from context (not a new IPC call), so adding it to the `useCallback` dependency array does not cause re-renders. `useLanguage` is already imported in `useVocabularies` — confirm before assuming a new import is needed.

**Verification:**

Update existing `TC-UV-08` in `src/renderer/hooks/__tests__/useVocabularies.test.ts`:
- Assert `window.electronAPI.incrementVocabUsage` is called with `(field, value, 'en')` when language is `'en'`.
- Add a parallel case for `'es'`.

Update `validation.test.ts` (TC-VS-20 through TC-VS-23):
- TC-VS-20: valid `{ field, value, locale: 'en' }` passes.
- New TC-VS-24: missing `locale` field rejected.
- New TC-VS-25: invalid locale string (e.g. `'fr'`) rejected.
- TC-VS-23 (extra properties): existing assertion continues to pass since `locale` is now a defined key.

DB unit test: assert `incrementVocabularyUsage('era', 'Medieval', 'en')` updates only the EN row; ES row `usage_count` remains unchanged.
