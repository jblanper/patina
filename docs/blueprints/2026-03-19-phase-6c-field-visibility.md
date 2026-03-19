# Implementation Blueprint: Phase 6 - Field Visibility Settings

**Date:** 2026-03-19
**Status:** Approved
**Reference:** `docs/technical_plan.md`

## 1. Objective

Allow users to customize which coin fields are visible in the Ledger (detail view) and Cabinet (gallery card). This enables collectors to focus on the metrics most relevant to their collection while keeping the interface clean.

### Philosophical Alignment
- [ ] **Archival Ledger Aesthetic:** Settings panel must feel like adjusting a museum display case - elegant, not utilitarian.
- [ ] **Privacy First:** All visibility preferences stored locally in SQLite - no external sync.
- [ ] **Single-Click Rule:** Quick access to toggle field visibility from the Ledger header.

---

## 2. Technical Strategy

### A. Database Schema Changes

**Table: `field_visibility`**
```sql
CREATE TABLE field_visibility (
  key TEXT PRIMARY KEY,          -- e.g., 'ledger.weight', 'card.diameter'
  visible INTEGER DEFAULT 1,     -- 1 = visible, 0 = hidden
  sort_order INTEGER DEFAULT 0   -- For future: custom field ordering
);
```

**Default Visibility Settings:**
| Key | Default | Description |
|-----|---------|-------------|
| `ledger.title` | true | Coin designation |
| `ledger.issuer` | true | Ruler/authority |
| `ledger.denomination` | true | Nominal value |
| `ledger.year` | true | Date display |
| `ledger.era` | true | Historical period |
| `ledger.mint` | true | Minting location |
| `ledger.metal` | true | Material composition |
| `ledger.weight` | true | Weight in grams |
| `ledger.diameter` | true | Size in mm |
| `ledger.die_axis` | false | Die axis (expert field) |
| `ledger.fineness` | false | Purity (expert field) |
| `ledger.grade` | true | Condition grade |
| `ledger.obverse_legend` | true | Obverse inscription |
| `ledger.obverse_desc` | true | Obverse description |
| `ledger.reverse_legend` | true | Reverse inscription |
| `ledger.reverse_desc` | true | Reverse description |
| `ledger.edge_desc` | false | Edge description |
| `ledger.catalog_ref` | true | Catalog reference |
| `ledger.rarity` | true | Rarity indicator |
| `ledger.provenance` | false | Ownership history |
| `ledger.story` | true | Curator's narrative |
| `ledger.acquisition` | false | Purchase details |

**Card (Gallery) Visibility:**
| Key | Default | Description |
|-----|---------|-------------|
| `card.metal` | true | Material badge |
| `card.year` | true | Year display |
| `card.grade` | false | Grade badge |

### B. UI Component: FieldVisibilitySettings

**Trigger:** Gear icon or "Customize" link in Ledger header

**Panel Design:**
- Slide-in panel or modal overlay
- Two columns: "Visible Fields" and "Hidden Fields"
- Drag-and-drop to reorder (future enhancement)
- Checkbox toggles for each field
- "Reset to Defaults" button
- "Apply" button to save

**Visual Design (Manuscript Hybrid v3.3):**
```css
.field-visibility-panel {
  position: fixed;
  right: 0;
  top: 0;
  height: 100vh;
  width: 320px;
  background: var(--parchment);
  border-left: 1px solid var(--border-hairline);
  box-shadow: -4px 0 12px rgba(0,0,0,0.1);
  z-index: 100;
}

.field-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.field-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-hairline);
  font-family: var(--font-serif);
  font-size: 0.9rem;
}
```

### C. IPC Handlers

| Handler | Purpose |
|---------|---------|
| `prefs:getVisibility` | Get all field visibility settings |
| `prefs:setVisibility` | Update visibility for one or more fields |
| `prefs:resetVisibility` | Reset to default visibility |

### D. Implementation Steps

1. **Database Migration**
   - Create `field_visibility` table
   - Seed with default visibility values

2. **Backend (`src/main/`)**
   - Add `getFieldVisibility()`, `setFieldVisibility()` to `db.ts`
   - Add IPC handlers

3. **Frontend Hooks**
   - Create `useFieldVisibility.ts` hook
   - Provides: `visibility`, `setVisibility`, `resetToDefaults`

4. **Settings Component**
   - Create `FieldVisibilitySettings.tsx`
   - Integrate into `CoinDetail.tsx` header
   - Create `useFieldVisibility.ts` hook

5. **Update Ledger and Card Components**
   - `CoinDetail.tsx`: Conditionally render fields based on visibility
   - `CoinCard.tsx`: Conditionally show badges based on visibility

6. **Context Provider**
   - Wrap app in `FieldVisibilityProvider` to share visibility state

---

## 3. Verification Strategy (Quality Oversight)

### Testing Plan
- **Unit Tests:**
  - `src/main/db.test.ts`: Visibility CRUD
  - `src/renderer/hooks/__tests__/useFieldVisibility.test.ts`: State management
- **Component Tests:**
  - `FieldVisibilitySettings.test.tsx`: Toggle behavior, reset functionality

### Colocation Check
- `src/renderer/components/FieldVisibilitySettings.test.tsx` next to component
- `src/renderer/hooks/__tests__/useFieldVisibility.test.ts`

### Mocking Strategy
- Mock `window.electronAPI.prefs:*` methods
- Mock localStorage for component state (if needed)

---

## 4. Architectural Oversight (`curating-blueprints`)
**Status:** Pending

### Audit Findings:
- **System Integrity:** Visibility state should be cached in React context to avoid redundant IPC calls
- **Abstraction:** FieldVisibilityProvider encapsulates all visibility logic
- **Defaults:** Sensible defaults ensure new users have a good experience

### Review Notes & Suggestions:
- [Pending Phase II Audit]

---

## 5. Security Assessment (`securing-electron`)
**Status:** Pending

### Audit Findings:
- **No Security Concerns:** Purely UI configuration, no sensitive data exposed
- **Input Validation:** Field keys validated against whitelist

### Review Notes & Suggestions:
- [Pending Phase II Audit]

---

## 6. Quality Assessment (`assuring-quality`)
**Status:** Pending

### Audit Findings:
- **Coverage:** 90% for `useFieldVisibility`, 80% for components
- **Accessibility:** Keyboard navigation in settings panel

### Review Notes & Suggestions:
- [Pending Phase II Audit]

---

## 7. UI Assessment (`curating-ui`)
**Status:** Pending

### Audit Findings:
- **Aesthetic Compliance:** Panel must match Manuscript Hybrid v3.3
- **Responsiveness:** Panel should not break mobile layouts

### Review Notes & Suggestions:
- [Pending Phase II Audit]

---

## 8. Numismatic & UX Assessment (`curating-coins`)
**Status:** Issues Found

### Audit Findings:

| Field | Default | Assessment |
|-------|---------|------------|
| `ledger.weight` | true | ✅ Correct - Weight is a primary diagnostic and must be visible by default |
| `ledger.diameter` | true | ✅ Correct - Diameter is essential for identification |
| `ledger.grade` | true | ✅ Correct - Grade determines value and condition |
| `ledger.die_axis` | false | ✅ Correct - Diagnostic field for experts only |
| `ledger.fineness` | false | ✅ Correct - Technical metric, not required for casual viewing |
| `card.grade` | false | ❌ **ISSUE** - Grade should be visible on gallery cards; primary value indicator |
| `ledger.catalog_ref` | true | ✅ Correct - RIC/RPC reference is essential |
| `ledger.rarity` | true | ✅ Correct - Rarity affects desirability |
| `ledger.provenance` | false | ✅ Correct - Privacy-sensitive, show on demand |
| `ledger.edge_desc` | false | ✅ Correct - Edge devices vary; not always present |

### Review Notes & Suggestions:

1. **[CRITICAL]** Change `card.grade` from `false` to `true` - The grade is the single most important condition indicator for collectors. Hiding it on gallery cards forces users to click into every coin to assess value. This violates the "Single-Click Rule" for priority data.

2. **[RECOMMENDED]** Consider adding `card.weight` to Card defaults - Weight provides immediate identification context on gallery cards without requiring detail view.

3. **[OPTIONAL]** The `provenance` field visibility at `false` is appropriate for privacy, but consider adding a "Show Provenance" quick-toggle in the detail view header for transparency without cluttering defaults.

### Technical Metric Compliance:
- ✅ All technical fields follow `references/technical_metrics.md` standards
- ✅ Die axis notation uses O'Clock positions (1-12h)
- ✅ Weight/Diameter formatting handled at display layer (not visibility concern)

### Collector Workflow Alignment:
The default visibility settings support a professional collector's workflow:
1. **Quick Assessment** (Gallery) → Metal, Year, **Grade** (FIX NEEDED), Weight (RECOMMENDED)
2. **Detailed Examination** (Ledger) → Full technical data including hidden diagnostic fields
3. **Expert Analysis** → Toggle die_axis, fineness for authentication/attribution

---

## 9. User Consultation & Decisions
### Open Questions:
1. Should visibility settings be per-collection or global? → **GLOBAL**
2. Should we allow custom field groupings? → Future enhancement
3. Should "Reset to Defaults" be available or just "Apply"? → Yes, include Reset

### Final Decisions:
- **Scope:** Global visibility (applies to all coins)
- **Card Defaults:** Set `card.grade` to visible (priority field)
- **Card Defaults:** Add `card.weight` to visible fields
- **Reset:** Include "Reset to Defaults" button

---

## 10. Post-Implementation Retrospective
**Date:** Pending
**Outcome:** TBD

### Summary of Work
- [Pending implementation]

### Pain Points
- [Pending implementation]

### Things to Consider
- [Future: Custom field ordering via drag-and-drop]
- [Future: Export/Import visibility profiles]
- **Core Doc Revision:** Document visibility feature in user guide
