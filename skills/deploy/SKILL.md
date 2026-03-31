---
name: deploy
description: Full release pipeline for Patina — lint, tests, build, version bump, changelog, commit and tag, push, wait for Windows CI build, create GitHub release.
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash
---

# Deploy Skill

Prepare and release a new version of Patina. The Windows `.exe` installer is built by GitHub Actions — this skill drives the full pipeline from clean tree to published GitHub Release.

## Version bump rules

- **Patch** (x.x.+1) — bug fixes, style tweaks, translation updates, performance improvements
- **Minor** (x.+1.0) — new user-facing features (new fields, views, tools, workflows)
- **Major** (+1.0.0) — DB schema changes that break existing user data or require a migration

Inspect the commits since the last tag (`git log {last-tag}..HEAD --oneline`) to decide which applies. When in doubt, ask the user before proceeding.

## Steps

1. **Verify environment**
   - Confirm we're on the `main` branch
   - Confirm the working tree is clean (`git status --porcelain`); if there are uncommitted changes, report them and stop

2. **Lint**
   - Run `npm run lint`
   - Fix any errors; warnings are acceptable but should be noted
   - Do not proceed if lint errors remain

3. **Type-check**
   - Run `npx tsc --noEmit && npx tsc -p tsconfig.main.json --noEmit`
   - Fix any errors before continuing — this is the Zero-Error Rule

4. **Tests**
   - Run `npm test`
   - If any tests fail, debug and fix, then re-run
   - Do not proceed if tests are red

5. **Build**
   - Run `npm run build`
   - If it fails, read the error, fix the root cause, and rebuild
   - Repeat up to 3 times; if still failing after 3 attempts, stop and report

6. **Determine version bump**
   - Run `git log $(git describe --tags --abbrev=0 2>/dev/null || echo "")..HEAD --oneline`
   - Apply the version bump rules above to decide patch / minor / major
   - State the decision and rationale before proceeding

7. **Run release script**
   - Call `bash scripts/release.sh [patch|minor|major]` with the decision from step 6
   - The script handles: version bump in `package.json`, `CHANGELOG.md` generation, commit, and annotated tag
   - Review the generated CHANGELOG entry and correct it if the grouping looks wrong

8. **Push**
   - Push the commit and tag:
     ```
     git push origin main
     git push origin v{version}
     ```
   - Pushing the tag triggers the `build-win.yml` GitHub Actions workflow automatically

9. **Wait for the Windows build**
   - Watch the CI run:
     ```
     gh run watch
     ```
   - If the run fails, read the logs (`gh run view --log-failed`), fix the root cause, and coordinate with the user before retrying

10. **Create GitHub Release**
    - Once the CI run succeeds, create the release:
      ```
      gh release create v{version} \
        --title "Patina v{version}" \
        --notes "{changelog entry for this version}"
      ```
    - The `.exe` artifact is already attached to the run; users can download it from the release page via the Actions artifact or the release assets

11. **Report**
    - Confirm the release was created and print the GitHub release URL
    - Remind the user that Windows SmartScreen will show an "Unknown publisher" warning on first run — the workaround is "More info → Run anyway"

---

## If deployment fails mid-way

- **Tag pushed, CI failed** — fix the root cause, delete the tag locally and remotely (`git tag -d v{version}`, `git push origin :refs/tags/v{version}`), re-run from step 7.
- **Tag pushed, release creation failed** — run `gh release create` again with the same tag (idempotent).
- **Commit pushed, tag failed** — run `git tag -a v{version} -m "v{version}"` then `git push origin v{version}`.
- **Commit failed** — working tree changes are local; re-run from step 7.
