# Context Snapshot: useCoins Hook Implementation Plan

**Date:** 2026-03-12

## High-Level Summary
Developed a comprehensive implementation plan for the `useCoins()` custom hook - a centralized state management solution for the Patina coin collection app. The plan includes enhanced security validation, Zod schemas, error boundaries, and professional numismatic filtering features. The v2 plan was approved as the authoritative guide for Phase 2, Point 1 of the technical roadmap.

## Key Code Changes
* `docs/plans/phase_2_p_1_v2.md`: Created comprehensive 217-line implementation plan with 13 executable steps, security audit status, and full dependency specification
* `docs/plans/phase_2_p_1.md`: Removed outdated version to avoid confusion

## Architectural Decisions & Context
- **Validation Strategy**: Chose Zod over manual validation for runtime type checking and schema reuse
- **Error Handling**: Added react-error-boundary component to prevent crashes and provide graceful degradation
- **Security First**: All IPC handlers require type guard validation (`isValidId`) and required field checks
- **Professional Features**: Include mint, rarity, and grade filters with adjective grading scale (MS/AU/XF/VF/F/VG/G/AG) per numismatic standards
- **Default Sort**: `year_numeric` ascending to display oldest coins first, respecting BC/AD chronology
- **Test Strategy**: Comprehensive unit tests including Zod schema validation and error boundary tests

## Next Steps / Unresolved Issues
* [ ] Install dependencies: `zod`, `react-error-boundary`, `@testing-library/react`, `@testing-library/jest-dom`
* [ ] Update `src/main/db.ts` with validation functions and secure IPC handlers
* [ ] Implement `src/validation/schemas.ts` with Zod schemas for Coin and filters
* [ ] Create `src/components/ErrorBoundary.tsx` for error handling
* [ ] Build `src/renderer/hooks/useCoins.ts` with filtering, sorting, and mutation logic
* [ ] Create `src/renderer/hooks/types/coinFilters.ts` for type definitions
* [ ] Write comprehensive tests in `src/hooks/useCoins.test.tsx`
* [ ] Update `src/renderer/App.tsx` to use the new hook
* [ ] Run full security audit using provided scripts after implementation
* [ ] Verify all 22 compliance checklist items are satisfied