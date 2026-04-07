## v1.2.0 — 2026-04-07

### Features
- bulk operations — edit field, delete, scoped export (CAB-B)

---

## v1.1.1 — 2026-04-03

### Fixes
- wire incrementUsage prop and case-insensitive filter matching

### Docs
- archive blueprint, standardise vocabulary pattern in AGENTS.md

---

# Changelog

## v1.1.0 — 2026-04-02

### Features
- complete implementation — IPC, field visibility, era vocabulary
- icon trio caption action bar — Decision 4 complete
- deploy skill + release script for Patina
- Windows NSIS installer — electron-builder config + GitHub Actions workflow
- field completeness — denomination, edge_desc, rarity, year_numeric
- Cabinet Command Strip toolbar + CoinCard grade row
- Phase 6c — Field Visibility Settings
- sidebar filter overflow (The Soft Reveal) + seed expansion
- update seed coins to reflect corrected era vocabulary
- year_numeric input — Year CE in metrics grid, era glossary correction
- PDF export redesign — prestige numismatic catalog
- Phase 1b Glossary — drawer, dagger triggers, i18n refactor, denomination expansion
- Phase 1a Glossary + fix era meta-line fallback
- implement Phase 6b internationalization (English/Spanish)
- implement Phase 7a cabinet sort controls and grade filter
- complete Phase 6a verification and add grade filter to Cabinet
- implement Phase 6a vocabulary system and migrate skills to vendor-neutral layout
- add blueprints for standardized values, i18n, and field visibility
- implement Phase 5 export system
- archive Phase 3.5 and Phase 4 blueprints, add Phase 5 preservation blueprint
- style mobile UI with Cormorant font and auto-stop server on upload
- implement Scriptorium Add/Edit form (Phase 3.5)
- implement strict 7-stage lifecycle and auto-archiving
- standardize high-fidelity mockup templates
- automate report archiving in tracking-progress skill
- implement local server and IPC bridge (Phase 4 partial)
- implement smart responsive grid and unified layout sanctuary
- implement Path B v2 CoinDetail archival folio view
- implement Phase 3 Coin Detail view and routing
- finalize Phase 2 gallery UI with empty states and lazy loading
- implement Sidebar and SearchBar for Phase 2 gallery layout
- implement database seeding utility with numismatically accurate test data
- implement gallery grid and coin card with archival pedestal aesthetic
- add curating-blueprints skill to standardize implementation lifecycle
- implement useCoins hook and defensive IPC validation
- rename electron-security to securing-electron and enhance security controls
- upgrade design system to Manuscript Hybrid v3.3 and rename curating-ui skill
- implement linting hook and structured schema extraction
- implement build status check hook
- implement database schema extraction hook
- implement electron-security skill
- implement numismatic-researcher skill
- implement database foundation and approved schema
- initial project scaffold for Patina

### Fixes
- correct EN validation copy + strengthen B-01/B-04 test assertions
- complete B-05 — remove all remaining glossary-hint † spans
- SCR-01 post-deployment bug sprint — B-01 through B-05
- SCR-01 bug sprint — F-01, F-02, L-01, L-05, A-02
- correct Spanish numismatic terminology in PDF export and UI
- restore Athens Tetradrachm fields lost in seed script edit
- replace jimp with nativeImage for JPEG normalization in PDF export
- PDF export — progressive JPEG, Montserrat italic, date format, cover redesign
- Phase 6b.2 — patch nine i18n defects and vocabulary regressions
- address post-commit review findings from a54bed6
- remediate 38 code review findings across 4 phases
- refine header toolbar buttons with archival styling and generous spacing
- remove redundant padding from Scriptorium container
- resolve mobile upload and image display issues
- prevent overflow and improve text wrapping in CoinDetail
- resolve critical ReferenceError, refactor styling to Vanilla CSS, and codify zero-error build policy
- correctly configure schema hook via settings.json

### Docs
- archive blueprint, update ipc_api and style_guide
- SCR-02 — Completed, archived; document .btn-ghost in style guide
- SCR-03 — Proposed, all four audits complete
- SCR-02 — integrate SCR-01 §11 follow-up backlog (C-01–C-03)
- SCR-01 Section 11 — Completed, retrospective added
- archive SCR-01 — Completed
- Scriptorium audit + three SCR blueprints (Draft)
- blueprint for Windows NSIS installer via GitHub Actions (Proposed)
- coin research panel — research update + blueprint draft
- blueprint + UI mockup for field completeness (FLD-01)
- complete Phase 6c blueprint and archive sidebar overflow
- add scouting research report for Coin Research Panel
- add skills/ directory to README project structure
- redesign technical_plan.md as compass and add scouting-ideas skill
- audit and sync documentation with completed phases 6A, 6B, 7
- remove era default, update README to reflect current feature set
- trim CLAUDE.md to ~130 lines, remove era default
- comprehensive CLAUDE.md — full parity with AGENTS.md
- promote key AGENTS.md mandates into CLAUDE.md
- sync CLAUDE.md and AGENTS.md with archived blueprint learnings
- add Spanish translation of coin fields glossary
- blueprint and proposal for sidebar filter overflow (The Soft Reveal)
- add comprehensive coin fields glossary
- complete Phase 7a verification and archive blueprint
- resolve all open issues in Phase 6a blueprint
- update AGENTS.md with remediation standards
- archive code-review-remediation blueprint
- add comprehensive code review and UX/UI audit report
- add Diátaxis-compliant documentation for phases 3.5-5
- refactor workflows_and_skills.md and cli_extensions.md to reduce duplication
- add CLAUDE.md with architecture and development guidance
- update AGENTS.md to v1.1
- add Modern Online Resources table for reference lookup
- add Nomisma.org taxonomy integration and update coin references
- update status to complete and document overflow fixes
- add CoinDetail style alignment plan
- add note about ESLint v9 migration fix
- formalize 'The Filter' principle and quality mandates across skills and core documentation
- sync changelogs with Phase 2 UI completion and standards resolution
- finalize Phase 2 technical plan and blueprint
- update Phase 2 progress and initiate Sidebar/SearchBar blueprint
- refactor CLI extensions to Diátaxis and sync v3.3 aesthetic
- add changelog for architecture and testing standards expansion
- implement Phase 2 architecture and testing standards
- add curating-blueprints and tracking-progress skills to workflows guide
- add context snapshot for style guide sync
- sync style guide (v3.3) with Phase 2 hook implementation
- add workspace context snapshot for useCoins hook planning
- replace useCoins hook plan with comprehensive v2
- save context snapshot for standards refinement work
- add dependency management standards to GEMINI.md and create audit report
- refine engineering standards and update GEMINI.md
- rename numismatic-researcher to curating-coins and refactor skill documentation
- refactor workflows_and_skills.md into technical reference
- update skill name from electron-security to securing-electron
- update mandates and workflows for linting hook and structured schema
- finalize skill and hook documentation
- update README with new design standards and Gemini CLI skills
- unify custom skills in core engineering mandates
- formalize skill usage and developer onboarding
- synchronize design system and update curator-ui skill
- add workflows and skills documentation
- implement "The Gallery" v2.0 design system and enhance curator-ui skill
- detail Phase 2 tasks in technical plan
- add GEMINI.md and formalize README.md

### Chores
- ignore SQLite DB/WAL files and coverage output; archive field-completeness blueprint
- delete main-process export test files and infrastructure

### Other
- test: glossary verification — tests, CSS touch targets, blueprint archived
- Implement UX/UI refinements: filter checkboxes, form alignment, header updates
- test: add missing test coverage for Phase 4 mandates
- Lens: auto-close QR modal, always show replace button, simplify event handling
- refactor(skills/hooks): unify curatorial skills and optimize automated validation
- style(ledger): align CoinDetail with Path B v2 mockup
- Add new writing-tech-docs skill and update evaluating skills with missing information so its audits are more precise and complete

---

