# Implementation Blueprint: Windows Distribution — NSIS Installer via GitHub Actions

**Date:** 2026-03-31
**Status:** Proposed
**Reference:** `package.json` (existing `electron-builder` devDependency v26.8.1)

---

## 1. Objective

Package Patina as a Windows `.exe` NSIS installer, built automatically on a GitHub Actions Windows runner and downloadable as a workflow artifact. Windows users run the installer to get a standard Start Menu + Desktop shortcut install — no developer tooling required.

### Philosophical Alignment

- [x] **Archival Ledger Aesthetic:** This is a build/distribution concern only — zero UI changes. The installed product is identical to the dev build.
- [x] **Privacy First:** No telemetry, no auto-update server, no CDN. The artifact is a static file. User data stays in `AppData\Roaming\Patina` (the OS-standard `userData` path on Windows).
- [x] **Single-Click Rule:** N/A — this is infrastructure, not a UI feature.

---

## 2. Technical Strategy

### 2.1 Pre-conditions verified

| Check | Status | Evidence |
|-------|--------|----------|
| `electron-builder` v26 installed | ✅ | `package.json` devDependencies |
| `@electron/rebuild` installed | ✅ | `package.json` devDependencies |
| DB path uses `app.getPath('userData')` when packaged | ✅ | `src/main/db.ts` line 166–168 |
| Image root uses `app.getPath('userData')` when packaged | ✅ | `src/main/index.ts` line 88–90 |
| Vocabulary auto-seeds on `app.whenReady()` | ✅ | `src/main/index.ts` lines 83–84 |
| Field visibility auto-seeds on `app.whenReady()` | ✅ | `src/main/index.ts` line 84 |
| GitHub repo exists | ✅ | Confirmed by user |

**No application code changes are required.** This blueprint is config + CI only.

### 2.2 Decision: No code signing

Windows Defender SmartScreen will display an "Unknown publisher" warning on first run. A self-signed certificate provides no improvement over unsigned (SmartScreen treats both the same). The approach is to ship unsigned for now and communicate the workaround ("More info → Run anyway") in release notes. An EV certificate can be added later without any changes to this blueprint's structure.

### 2.3 Decision: Per-user install, no admin required

`nsis.perMachine: false` (default) installs to `%LOCALAPPDATA%\Programs\Patina`. This avoids UAC elevation prompts, which would compound the SmartScreen friction on an unsigned build. The `userData` path (`%APPDATA%\Patina`) is user-scoped and writable — no privilege issues.

### 2.4 Decision: NSIS wizard (not one-click)

`nsis.oneClick: false` presents a traditional installer wizard. For a collector audience who may be security-conscious, a visible install wizard is more trustworthy than a silent installer. One-click silent installs are also more likely to pattern-match malware heuristics.

### 2.5 Decision: Output directory `release/`

`electron-builder` defaults to `dist/` for packaged output. Since Vite and `tsc` both write to `dist/`, we redirect electron-builder output to `release/` to avoid collisions. `release/` is gitignored.

### 2.6 `package.json` build config changes

Replace the existing minimal `build` block with:

```json
"build": {
  "appId": "com.patina.collector",
  "productName": "Patina",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "!dist/**/*.map",
    "package.json"
  ],
  "asarUnpack": [
    "**/node_modules/better-sqlite3/**/*",
    "**/node_modules/bindings/**/*"
  ],
  "extraResources": [
    {
      "from": "assets/fonts/",
      "to": "fonts/",
      "filter": ["**/*.ttf"]
    }
  ],
  "win": {
    "target": "nsis"
  },
  "nsis": {
    "oneClick": false,
    "perMachine": false,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "Patina"
  }
}
```

**Why `asarUnpack` for `better-sqlite3`:** Native `.node` binaries cannot be loaded from inside an asar archive on Windows. The unpack directive extracts those files to `app.asar.unpacked/` while keeping all other code packed.

**Why no `win.icon`:** No `.ico` file exists in the repo yet. electron-builder falls back to the default Electron icon. A custom icon is a recommended follow-up (see Section 9).

**Why `!dist/**/*.map`:** Source maps add ~30–50 % to bundle size with no user benefit. Excluded from the package.

### 2.7 New npm script

Add to `scripts`:

```json
"dist:win": "electron-builder --win --publish never"
```

The `--publish never` flag prevents accidental uploads to GitHub Releases if a `GH_TOKEN` is present in the environment. Artifact upload is handled exclusively by the CI workflow.

### 2.8 `.gitignore` addition

Add `release/` to `.gitignore` to prevent local build artifacts from being committed.

### 2.9 GitHub Actions workflow

Create `.github/workflows/build-win.yml`:

```yaml
name: Build Windows Installer

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  build-windows:
    runs-on: windows-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Rebuild native modules for Electron
        run: npx @electron/rebuild -f -w better-sqlite3

      - name: Build renderer and main process
        run: npm run build

      - name: Package Windows installer
        run: npx electron-builder --win --publish never

      - name: Upload installer artifact
        uses: actions/upload-artifact@v4
        with:
          name: patina-windows-installer
          path: release/*.exe
          retention-days: 30
```

**Step-by-step rationale:**

| Step | Why |
|------|-----|
| `actions/checkout@v4` | Standard; v4 uses Node 20 runner internally |
| `actions/setup-node@v4` with cache | Matches local Node 24; npm cache speeds up subsequent runs |
| `npm ci --legacy-peer-deps` | Matches project-mandated install command (React 19 peer-dep friction) |
| `@electron/rebuild -f -w better-sqlite3` | Compiles the native `.node` binding for the Windows Electron ABI — cannot be skipped |
| `npm run build` | Runs `vite build` + `tsc -p tsconfig.main.json` — produces `dist/` |
| `electron-builder --win --publish never` | Packages to `release/*.exe` NSIS installer |
| `upload-artifact@v4` | Makes the `.exe` downloadable from the Actions tab for 30 days |

**Trigger strategy:** Builds on every push to `main` (so each merge produces a fresh artifact) and on manual dispatch (for ad-hoc release builds from any branch).

---

## 3. Verification Strategy

Since this blueprint produces no application code changes, verification focuses on the CI pipeline itself.

### 3.1 Manual verification checklist (after first successful CI run)

- [ ] GitHub Actions run completes without error on `windows-latest`
- [ ] Artifact `patina-windows-installer` appears in the Actions run summary
- [ ] Downloaded `.exe` launches the NSIS wizard on a Windows machine (or VM)
- [ ] App installs to `%LOCALAPPDATA%\Programs\Patina`
- [ ] Start Menu and Desktop shortcuts are created
- [ ] App launches; cabinet view loads
- [ ] Adding a coin persists to `%APPDATA%\Patina\patina.db`
- [ ] Vocabulary autocomplete suggestions populate (confirms `seedVocabularies()` ran)
- [ ] Uninstall via Add/Remove Programs works cleanly

### 3.2 TypeScript gate

`npx tsc --noEmit` must pass locally before the PR is merged — no TS changes in this blueprint, so this is a formality.

### 3.3 No new tests required

This blueprint adds zero new source files. CI workflow correctness is verified by the successful Actions run itself.

---

## 4. Architectural Oversight (`curating-blueprints`)

**Status:** Verified

### Audit Findings:

- **System Integrity:** No cross-process changes. `app.isPackaged` branching in `db.ts` and `index.ts` is already correct. The `generateSQL(SCHEMA)` call on startup creates tables idempotently — a fresh Windows install gets a valid empty DB.
- **Abstraction:** No new IPC handlers. The Electron bridge is untouched.
- **asar unpacking:** `asarUnpack` for `better-sqlite3` + `bindings` is the correct pattern for native Node addons on Windows. Without this, the app crashes on launch with `MODULE_NOT_FOUND` for the `.node` file.
- **Output directory conflict:** `release/` avoids the `dist/` collision with Vite and tsc output. This is the canonical electron-builder pattern for projects with a separate build step.

### Review Notes & Suggestions:

- The absence of a `.ico` icon is cosmetic but meaningful for collector trust — a blank Electron icon undermines the "archival-grade" perception. Recommend creating `assets/icon.ico` (256×256) as a near-term follow-up.
- `retention-days: 30` for artifacts is appropriate for a private repo. Adjust to 7 if storage becomes a concern.
- When a paid EV certificate is eventually obtained, add `win.certificateFile` and `win.certificatePassword` as GitHub Actions secrets — no structural changes to this blueprint required.

---

## 5. Security Assessment (`securing-electron`)

**Status:** Verified — No issues identified.

### Audit Findings:

- **The Filter:** No new IPC handlers. Existing Zod validation in `src/main/db.ts` is unaffected.
- **Protocols:** `patina-img://` protocol handler is unchanged. Path traversal sanitization (`..` blocking) remains in effect in the packaged build.
- **contextIsolation / sandbox:** `contextIsolation: true`, `sandbox: true` — no changes to `BrowserWindow` configuration.
- **CI secrets:** `--publish never` ensures `GH_TOKEN` (if present) is never used to push to GitHub Releases inadvertently. No secrets are needed for an unsigned build.
- **Artifact trust:** The `.exe` is produced in an ephemeral GitHub Actions runner from the checked-in source. The supply chain is as trustworthy as GitHub's `windows-latest` runner images.

### Review Notes & Suggestions:

- Verify the GitHub repo is private or that you are comfortable with the installer artifact being publicly downloadable if the repo is public.
- When code signing is added later, the certificate password must be stored as a GitHub Actions secret, never hardcoded.

---

## 6. Quality Assessment (`assuring-quality`)

**Status:** Verified — No issues identified.

### Audit Findings:

- **Coverage Check:** No new source files. No coverage delta.
- **Async Safety:** N/A.
- **Colocation Rule:** N/A — no new test files needed. CI workflow correctness is self-validating (either it produces a `.exe` or it fails).

### Review Notes & Suggestions:

- Consider adding a future smoke-test job to the workflow (e.g., Playwright on `windows-latest`) to verify the packaged app launches. Out of scope for this blueprint but noted as a follow-up.

---

## 7. UI Assessment (`curating-ui`)

**Status:** Verified — No issues identified.

### Audit Findings:

- **Aesthetic Compliance:** No UI changes in this blueprint.
- **Accessibility:** No UI changes in this blueprint.

### Review Notes & Suggestions:

- The NSIS installer itself has a default Electron appearance. A custom installer banner graphic (`assets/installerSidebar.bmp`, 164×314 px) can be added via `nsis.installerSidebarImage` to reinforce the Patina brand during installation. Out of scope for this blueprint.

---

## 8. Numismatic & UX Assessment (`curating-coins`)

**Status:** Verified — No issues identified.

### Audit Findings:

- **Historical Accuracy:** N/A — no coin data or catalog changes.
- **Collector UX:** The per-user install (no admin), wizard-style installer, and automatic vocabulary seeding on first launch are all appropriate for a collector audience. A collector on a shared or managed Windows PC can install without IT involvement.

### Review Notes & Suggestions:

- Document the SmartScreen "More info → Run anyway" workaround in the GitHub release notes so collectors are not alarmed. This is the only known friction point for Windows end-users.

---

## 9. User Consultation & Decisions

### Open Questions resolved before Proposed status:

1. **Code signing?** → Self-signed ruled out (no benefit over unsigned). Unsigned for now. EV cert deferred.
2. **Build machine?** → GitHub Actions `windows-latest` runner (no Windows machine available locally).
3. **App name?** → "Patina" (confirmed by user).
4. **Distribution channel?** → GitHub Actions artifact (downloadable from Actions tab). GitHub Releases upgrade is a future option.

### Final Decisions:

- Unsigned NSIS installer, SmartScreen warning accepted.
- Per-user install, no UAC prompt.
- Wizard-style (not one-click) installer.
- Artifact retention: 30 days.
- Custom icon deferred — follow-up task: create `assets/icon.ico`.

---

## 10. Post-Implementation Retrospective

**Date:** —
**Outcome:** —

### Summary of Work
- —

### Pain Points
- —

### Things to Consider
- Add `assets/icon.ico` (256×256) for brand presence in installer and taskbar.
- Add `assets/installerSidebar.bmp` (164×314) for branded NSIS wizard sidebar.
- Upgrade artifact upload to GitHub Releases when ready for public distribution.
- Add Playwright smoke test on `windows-latest` to verify packaged app launches.
- **Core Doc Revision:** Confirm if `AGENTS.md` or `docs/technical_plan.md` need a "Distribution" section added post-completion.
