# Context Snapshot: Style Guide Sync (v3.3)
**Date:** 2026-03-13

## High-Level Summary
This session focused on reviewing and synchronizing the Patina project's style guides with the technical changes from Phase 2 Task 1 (the `useCoins` hook). We updated the visual and technical documentation to reflect new standards for numismatic precision, filtering UI, and data validation.

## Key Code Changes
* `docs/style_guide.md`: Updated to include the "2-Decimal Rule" for weight, "1-Decimal Rule" for diameter, and formalized the Sidebar and Filtering sections.
* `docs/style_guide.html`: Synchronized visual references with the markdown guide, adding a mock sidebar, metric precision rules, and updating the overall design system version to v3.3.
* `src/renderer/styles/index.css`: Reviewed against the style guide to ensure alignment with the "Manuscript Hybrid" aesthetic.

## Architectural Decisions & Context
* **Metric Precision:** Formally adopted strict decimal rules (2 for weight, 1 for diameter) as a design and validation standard to ensure scholarly integrity.
* **Sidebar Architecture:** Defined a fixed `280px` width and persistent left-side position for the "Archive Explorer" to maintain layout stability during filtering.
* **Validation as Design:** Integrated Zod validation directly into the design system's form input standards, treating technical error states as a first-class citizen of the UI.

## Next Steps / Unresolved Issues
* [ ] **T2: Foundational Components:** Implement `CoinCard` (The Pedestal) and `GalleryGrid` using the updated styles and the `useCoins` hook.
* [ ] **T3: The Sidebar:** Build the actual `PatinaSidebar` component using the mock styles defined in the HTML guide.
* [ ] **T4: Global Search:** Implement the search bar with the 300ms debounced behavior.
