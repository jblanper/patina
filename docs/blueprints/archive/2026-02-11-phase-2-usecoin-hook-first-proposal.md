# Patina useCoins() Hook Implementation Plan - Version 2

## Goal
Develop a `useCoins()` custom hook for centralized state, filtering, and DB interaction as specified in Phase 1, Point 1 of the technical plan, with enhanced security, validation, and error handling.

## Files to Create/Modify
1. `src/renderer/hooks/useCoins.ts` - Main hook implementation
2. `src/renderer/hooks/types/coinFilters.ts` - Filter and sort types
3. `src/renderer/hooks/useCoins.test.tsx` - Comprehensive test suite
4. `src/validation/schemas.ts` - Zod validation schemas
5. `src/validation/validators.ts` - Input validation functions
6. `src/components/ErrorBoundary.tsx` - Error handling component
7. `src/main/db.ts` - Add security validation (updates)
8. `src/renderer/electron.d.ts` - Add new IPC methods (updates)

## Dependencies to Add
```json
{
  "dependencies": {
    "zod": "^3.23.8",
    "react-error-boundary": "^5.0.8"
  },
  "devDependencies": {
    "@testing-library/react": "^18.2.0",
    "@testing-library/jest-dom": "^6.2.0"
  }
}
```

## Hook Requirements
Based on GEMINI.md, technical plan, and enhanced security requirements:

### Core Functionality
- Centralized state management for coins array
- Database interaction via existing IPC bridge
- Advanced filtering capabilities:
  - Era filter (Ancient, Medieval, Modern)
  - Metal filter (Gold, Silver, Bronze, etc.)
  - Mint filter (multi-select, derived from DB)
  - Rarity filter (Common/Uncommon/Rare/Very Rare/Extremely Rare)
  - Grade filter (adjective scale: MS/AU/XF/VF/F/VG/G/AG)
  - Global search (case-insensitive on: title, issuer, denomination, year_display, provenance, catalog_ref)
- Sorting capabilities:
  - Default: `year_numeric` ascending (oldest coins first)
  - Sort by any Coin field with null/undefined handling
- Loading and error states
- Memoization for performance (following GEMINI.md Point 30)
- Debounced search input (300ms delay) for real-time search

### Interface Design
```typescript
export interface FilterState {
  era: ('Ancient' | 'Medieval' | 'Modern')[];
  metal: string[];
  mint: string[];
  rarity: string[];
  grade: string[];
  searchTerm: string;
  sortBy: keyof Coin | null;
  sortAsc: boolean;
}

interface UseCoinsReturn {
  coins: Coin[];
  filteredCoins: Coin[];
  loading: boolean;
  error: Error | null;
  filters: FilterState;
  availableMetals: string[];
  availableMints: string[];
  availableRarities: string[];
  availableGrades: string[];
  setFilters: (updates: Partial<FilterState>) => void;
  clearFilters: () => void;
  refresh: () => Promise<void>;
  addCoin: (coin: NewCoin) => Promise<Coin>;
  updateCoin: (id: number, updates: Partial<NewCoin>) => Promise<void>;
  deleteCoin: (id: number) => Promise<void>;
  getCoinImages: (coinId: number) => Promise<CoinImage[]>;
}
```

## Implementation Details

### 1. State Management
- Use `useState` for coins array, loading, error states
- Use `useState` for filter configurations
- Use `useMemo` for filtered/sorted coin lists
- Use `useCallback` for setter functions

### 2. Database Interaction
- Initialize by fetching all coins via `window.electronAPI.getCoins()`
- Populate available filter options via `SELECT DISTINCT` queries:
  - `availableMetals`: `SELECT DISTINCT metal FROM coins WHERE metal IS NOT NULL`
  - `availableMints`: `SELECT DISTINCT mint FROM coins WHERE mint IS NOT NULL`
  - `availableRarities`: `SELECT DISTINCT rarity FROM coins WHERE rarity IS NOT NULL`
  - `availableGrades`: `SELECT DISTINCT grade FROM coins WHERE grade IS NOT NULL`
- Default sort: `year_numeric` ascending (oldest coins first)
- Provide wrapper functions for all coin mutations (add/update/delete)
- Auto-refresh lists after mutations (re-fetch coins and update available filter options)
- **Input Validation (for all IPC handlers):**
  - Validate `id` / `coinId` is a positive integer using type guard: `const isValidId = (n: unknown): n is number => typeof n === 'number' && n > 0 && Number.isInteger(n)`
  - Validate `NewCoin` objects with Zod or manual type guards before database insertion
  - Ensure required field `title` is present and non-empty

### 3. Filtering Logic
- Era: multi-select filter matching schema constraints (Ancient/Medieval/Modern)
- Metal: multi-select filter using values derived from `SELECT DISTINCT metal`
- Mint: multi-select filter using values derived from `SELECT DISTINCT mint`
- Rarity: multi-select filter (Common/Uncommon/Rare/Very Rare/Extremely Rare)
- Grade: multi-select filter using adjective scale (MS/AU/XF/VF/F/VG/G/AG)
- Search: case-insensitive `toLowerCase().includes()` matching on: `title`, `issuer`, `denomination`, `year_display`, `provenance`, `catalog_ref`
- Sort: configurable by any Coin field with null/undefined handling using nullish-coalescing (`??`)
- Default sort: `year_numeric` ascending (oldest first)

### 4. Performance Optimizations
- Use `useCallback` for setter functions
- Memoize expensive filter/sort operations with `useMemo`
- Debounce search input (300ms delay) for real-time search
- Default sort is pre-sorted from DB (no initial sort computation needed)
- Consider pagination if collection exceeds 100 items (optional future enhancement)

### 5. Error Handling
- Try/catch around all IPC calls
- Set error state with descriptive message and log to console
- Return error in result tuple or expose `lastError` state for UI feedback
- **Input Validation Errors:** Catch and report validation failures (e.g., "Invalid coin ID", "Title is required")

### 6. Image Management
- Add `getCoinImages(coinId)` wrapper for IPC `getImagesByCoinId`
- Derive primary image URL from filtered images for display

### 7. Security & Validation
- Zod schemas for all coin fields and filter options
- Input validation for all IPC handlers
- Error boundaries preventing crashes
- Proper error message handling
- SQL injection prevention (already implemented)

## Dependencies
- React (useState, useEffect, useMemo, useCallback)
- Existing IPC bridge from `window.electronAPI`
- Types from `../common/types`
- Zod for validation
- react-error-boundary for error handling

## Testing Approach
1. Manual verification in App.tsx
2. Verify filtering works with sample data
3. Test loading/error states
4. Confirm mutations update state correctly
5. Check performance with larger datasets (simulated)
6. **Unit tests** for filter/sort logic (extract pure functions for testability)
   - Test filter by era
   - Test filter by metal
   - Test search matching (case-insensitive)
   - Test sort with null/undefined values
   - Test Zod validation schemas
   - Test error boundary functionality

## Implementation Steps
1. Install required dependencies
2. Update `src/main/db.ts` with validation functions
3. Create hooks directory: `mkdir -p src/renderer/hooks`
4. Create `src/renderer/hooks/useCoins.ts` with full implementation
5. Create `src/renderer/hooks/types/coinFilters.ts` with filter/sort types
6. Create `src/validation/schemas.ts` with Zod schemas
7. Create `src/validation/validators.ts` with input validation functions
8. Create `src/components/ErrorBoundary.tsx` with error handling
9. Update `src/renderer/electron.d.ts` with new IPC methods
10. Create `src/hooks/useCoins.test.tsx` with comprehensive tests
11. Update `src/renderer/App.tsx` to use the hook instead of direct state/IPC
12. Verify all existing functionality still works
13. Add basic filtering UI to demonstrate hook capabilities

## Integration Points
- Will replace direct state/IPC usage in App.tsx
- Will be used by forthcoming components:
  - GalleryGrid (Phase 2, Point 2)
  - PatinaSidebar (Phase 2, Point 3)
  - SearchBar (Phase 2, Point 4)

## Compliance Checks
- [x] Follows GEMINI.md custom hooks requirement (Point 28)
- [x] Uses TypeScript strict typing (Point 22)
- [x] Implements immutability patterns (Point 24)
- [x] Follows component-focused architecture (Point 27)
- [x] Includes optimization strategies (Point 30)
- [x] Exports reusable `FilterState` interface
- [/] Includes `getCoinImages` for image management (Images included in `getCoins` LEFT JOIN; separate method pending)
- [x] Implements case-insensitive search matching
- [x] Handles null/undefined values in sort comparator
- [x] Includes unit tests for filter/sort logic
- [ ] Includes `mint` filter (derived from DB)
- [ ] Includes `rarity` filter
- [ ] Includes `grade` filter (adjective scale)
- [x] Expands search to include `provenance` and `catalog_ref`
- [x] Default sort by `year_numeric` ascending
- [x] IPC handlers validate numeric IDs (type guard for `id > 0`)
- [x] `addCoin` validates required field `title` is present and non-empty
- [x] Uses Zod or type guards for `NewCoin` validation
- [x] Includes error boundaries for graceful error handling
- [x] Implements debounced search (300ms delay)
- [x] Includes loading states for async operations

## Security Audit Status
- ✅ Configuration Review: N/A (plan only)
- ✅ IPC Audit: Requires validation in `src/main/db.ts`
- ✅ Preload Bridge: Uses existing secure bridge
- ✅ Navigation Control: N/A (plan only)

## Next Steps
1. Review and approve the plan
2. Begin implementation following the steps
3. Run security audit after implementation
4. Add comprehensive testing
5. Integration with Phase 2 components