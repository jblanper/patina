# Context Snapshot: Database Seeding Utility
**Date:** 2026-03-13

## High-Level Summary
Created an `npm run db:seed` utility to populate the `data/patina.db` with numismatically accurate test data (Athens Tetradrachm, Edward I Penny, Morgan Dollar). This ensures consistent data for testing the Gallery and Ledger views.

## Key Code Changes
* `scripts/seed_data.ts`: Implementation of the seeding logic using `better-sqlite3`.
* `package.json`: Added `db:seed` script and `tsx` (dev tool). Note that `db:seed` uses `tsc` + `electron` to ensure compatibility with Electron's native module ABI.
* `docs/technical_plan_2026-03-10.md`: Updated Phase 1 to include the seeding task as completed.
* `docs/blueprints/2026-03-13-seed-data-script.md`: Created detailed blueprint documenting the implementation and the "Electron ABI" workaround.

## Architectural Decisions & Context
* **Native Module Compatibility:** Since `better-sqlite3` is compiled for Electron's ABI, standard `node` or `tsx` execution fails. The `db:seed` command explicitly uses `electron` to run the compiled script, ensuring the database connection works without re-compilation issues.
* **Deduplication:** The seed script checks for existing coin titles before insertion to allow safe repeated runs.

## Next Steps / Unresolved Issues
* [ ] Verify that the seeded coins render correctly in the `GalleryGrid` once the UI is further developed.
* [ ] Consider a shared `run-electron-script` utility if more DB-interactive scripts are needed.
