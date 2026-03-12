# Context Snapshot: Refine Engineering Standards & Add Dependency Management
**Date:** 2026-03-12

## High-Level Summary
This session refined the project's engineering standards documents to align with actual implementation and improve clarity. Key changes included correcting inconsistent references, expanding technical specifications, and adding a critical Dependency Management section to GEMINI.md. An audit report was also created to document findings and future recommendations.

## Key Code Changes
* `GEMINI.md`: Added version header (v1.0), replaced "White Cube" with "Archival Ledger" aesthetic, removed specific CSS/font details in favor of referencing `docs/style_guide.md`, clarified Lens bridge validation (zod), added security requirements (helmet, CORS, MIME types, size limits), expanded testing standards (Vitest, coverage targets, test structure), and inserted a new Dependency Management subsection.
* `AGENTS.md`: Added version header (v1.0) and fixed build command description from "Next.js optimization" to "Vite optimization".
* `docs/GEMINI_md_audit_2026-03-12.md`: Created comprehensive audit report documenting inconsistencies, completed improvements, gaps, and recommendations.
* `docs/changelog/2026-03-12-refactor-numismatic-skill.md`: Already staged from previous session (unchanged this session).

## Architectural Decisions & Context
* **Typography Resolution:** GEMINI.md no longer specifies fonts, deferring entirely to `docs/style_guide.md`. The style guide currently defines Montserrat for UI, while implementation uses Inter - this discrepancy remains open.
* **Dependency Management Policy:** Explicit standards introduced covering version ranges, security scanning cadence, lockfile discipline, upgrade process, critical dependency treatment, and deprecation handling.
* **Testing Infrastructure:** Confirmed Vitest + React Testing Library as the standard; test structure policy remains flexible (colocate or centralized `__tests__/` directory).
* **Documentation Versioning:** Both GEMINI.md and AGENTS.md now include explicit Version and Last Updated headers to track standards evolution.

## Next Steps / Unresolved Issues
* [ ] Resolve typography discrepancy: Update style_guide.md to reflect actual Inter usage OR change CSS implementation to Montserrat.
* [ ] Choose definitive test structure strategy (colocated vs `__tests__/`) and document consistently in GEMINI.md.
* [ ] Consider adding additional standards sections: Performance requirements, Accessibility (WCAG), Code review process, Release management.
