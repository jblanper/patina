# Context Snapshot: Phase 2 Documentation Expansion
**Date:** 2026-03-13

## High-Level Summary
Formalized the engineering standards for Phase 2 by creating authoritative documentation for Security Architecture and Testing Strategy. These documents resolve ambiguities identified in the previous `GEMINI.md` audit and codify the "Filter" principle and "Colocation" testing rule.

## Key Code Changes
* `docs/architecture/security_data_flow.md`: New document detailing "The Filter" principle, Zod validation layer, and secure IPC patterns.
* `docs/guides/testing_standards.md`: New document defining the Vitest stack, mandatory colocation of unit tests, and coverage targets.
* `GEMINI.md`: Updated to strictly reference the new documentation, replacing the ambiguous "colocate vs centralized" rule with a definitive "Colocate" mandate for unit tests.

## Architectural Decisions & Context
* **Definitive Test Structure:** We have officially adopted the **Colocation Strategy** for unit tests (e.g., `Component.test.tsx` next to `Component.tsx`) to support modularity. Integration tests remain in `src/__tests__/`.
* **Security Documentation:** Explicitly documented the `contextIsolation` and `sandbox` requirements to ensure future developers understand *why* the IPC bridge is structured this way.

## Next Steps / Unresolved Issues
* [ ] **T3: The Sidebar:** Proceed with Phase 2 implementation using the new testing standards (colocated tests).
* [ ] **Local Image Protocol:** Implement the `patina-img://` protocol as described in the new `security_data_flow.md`.
