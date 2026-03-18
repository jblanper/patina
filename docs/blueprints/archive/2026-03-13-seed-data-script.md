# Implementation Blueprint: Seed Data Script

**Date:** 2026-03-13
**Status:** Approved
**Reference:** `docs/blueprints/2026-03-13-seed-data-script.md`

## 1. Objective
Create an npm script (`npm run db:seed`) to populate the `data/patina.db` with numismatically accurate testing coins (Ancient, Medieval, Modern) for development and testing purposes. This ensures developers have a consistent dataset for UI and logic verification.

## 2. Technical Tasks

### T1: Install `tsx` (Superseded)
- **Original Plan:** Add `tsx` to `devDependencies`.
- **Outcome:** `tsx` was installed but not used for the final script execution due to native module incompatibility. We kept it as a general dev tool.

### T2: Create `scripts/seed_data.ts`
- **Location:** `scripts/seed_data.ts`
- **Logic:**
    1.  Import `Database` from `better-sqlite3`.
    2.  Define a `sampleCoins` array containing 3 distinct numismatic examples:
        -   **Ancient:** Athens Tetradrachm (High relief, classic motif).
        -   **Medieval:** Edward I Penny (Hammered, specific lettering).
        -   **Modern:** Morgan Dollar (Machine struck, precise metrics).
    3.  Connect to `data/patina.db`.
    4.  Iterate through `sampleCoins` and insert them into the `coins` table if they don't already exist (deduplication by title).
    5.  Exit process cleanly.

### T3: Update `package.json`
- **Location:** `package.json`
- **Action:** Add `"db:seed": "tsc scripts/seed_data.ts --module commonjs --target es2020 --esModuleInterop && electron scripts/seed_data.js && rm scripts/seed_data.js"` to `scripts`.
- **Reasoning:** `better-sqlite3` is compiled against Electron's V8 version. Running with standard `node` (via `ts-node` or `tsx`) fails with `NODE_MODULE_VERSION` mismatch. Running the script with `electron` binary resolves this.

## 3. Verification Strategy
- **Manual Test:** Run `npm run db:seed` and verify exit code 0. (Verified: Success)
- **Data Audit:** Use `sqlite3` CLI to query inserted rows. (Verified: 3 rows inserted correctly)
- **App Test:** Launch the app (`npm run dev`) and verify the coins appear in the gallery/grid. (Pending visual check, but data layer confirmed).

## 4. Numismatic Assessment (`curating-coins`)
- **Standards:**
    -   **Weights:** Exact grams (e.g., 17.20g for Tetradrachm).
    -   **Diameters:** Exact mm (e.g., 24.5mm).
    -   **Axis:** 1-12h clock format.
    -   **Legends:** Uppercase for Latin/Greek.
- **Data used:**
    -   Athens Tetradrachm: 17.20g, 24.5mm, 9h.
    -   Edward I Penny: 1.43g, 18.0mm, 12h.
    -   Morgan Dollar: 26.73g, 38.1mm, 6h.

## 5. Security Assessment (`securing-electron`)
- **Risk:** Script accesses the production database file directly.
- **Mitigation:** The script is a development utility (`db:seed`) and runs in the local environment. It does not expose endpoints or run in production builds.

---

## 7. Post-Implementation Retrospective
**Date:** 2026-03-13
**Outcome:** Success

### Summary of Work
- Implemented `scripts/seed_data.ts` with 3 numismatically accurate sample coins.
- Configured `npm run db:seed` to compile TS on-the-fly (to temp JS) and run with `electron` to ensure ABI compatibility with `better-sqlite3`.
- Verified data insertion via CLI.

### Pain Points
- **Native Module Version Mismatch:** `better-sqlite3` was compiled for Electron (v143) but `tsx` used Node (v137).
- **Resolution:** Ran the script using the `electron` binary to match the ABI. This required a compilation step (`tsc`) as Electron doesn't support TS directly out of the box without a loader.

### Things to Consider
- Future scripts interacting with the DB will need similar handling or a shared `run-script` utility that handles compilation and electron execution.
