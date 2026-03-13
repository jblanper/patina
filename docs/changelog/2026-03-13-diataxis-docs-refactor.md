# Context Snapshot: Diátaxis Documentation Refactor & Aesthetic Sync
**Date:** 2026-03-13

## High-Level Summary
Refactored the project's technical documentation into a structured Diátaxis framework and synchronized all references with the **Manuscript Hybrid (v3.3)** aesthetic. This session resolved legacy contradictions between the "White Cube" and "Archival Ledger" branding while improving the accessibility of CLI extension guides.

## Key Code Changes
* `docs/workflows_and_skills.md`: Refactored into an **Explanation** document focusing on the philosophy of Patina's automation.
* `docs/how-to/manage_cli_extensions.md`: Created a new **How-to** guide for skill management (listing, reloading, installing).
* `docs/reference/cli_extensions.md`: Created a new **Reference** document listing all skills, sub-agents, and hooks with their triggers.
* `README.md`: Updated "Design Standards" to reflect v3.3 branding (Cormorant/Montserrat/Parchment) and linked to new Diátaxis docs.
* `src/renderer/index.html`: Updated Google Font links to replace "Inter" with "Cormorant Garamond" and "Montserrat".
* `src/renderer/components/CoinCard.tsx`: Updated JSDoc to use "Archival Pedestal" terminology.
* `docs/style_guide.html`: Synchronized aesthetic terminology to "Archival Ledger".

## Architectural Decisions & Context
* **Diátaxis Quadrants:** Adopted the 4-quadrant documentation framework to separate theoretical understanding from practical instructions and technical references.
* **Aesthetic Consistency:** Standardized all documentation and source code comments to use the approved **Manuscript Hybrid / Archival Ledger** terminology, officially retiring "White Cube".
* **Font Strategy:** Switched to scholarly serifs (Cormorant) and functional sans (Montserrat) to support the "Scholarly Hybrid" typography goal.

## Next Steps / Unresolved Issues
* [x] **T3: The Sidebar:** Implement the `PatinaSidebar` with the correct v3.3 typography and parchment colors.
* [ ] **Custom Protocol:** Implement the `patina-img://` protocol to enable secure local image loading.
* [ ] **Cleanup:** Perform a final scan of legacy HTML style guides for any remaining "White Cube" mentions.
