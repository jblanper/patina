#!/usr/bin/env bash
# Usage: bash scripts/release.sh [patch|minor|major]
# Bumps version, generates CHANGELOG entry, commits, and tags.
# Does NOT push — the caller (or /deploy skill) handles that.
set -euo pipefail

BUMP=${1:-}
if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Usage: $0 [patch|minor|major]" >&2
  exit 1
fi

# ── Version bump ────────────────────────────────────────────────────────────
CURRENT=$(node -p "require('./package.json').version")
npm version "$BUMP" --no-git-tag-version --silent
NEW=$(node -p "require('./package.json').version")
echo "  version: $CURRENT → $NEW"

# ── Collect commits since last tag (fall back to all commits) ───────────────
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || true)
if [[ -n "$LAST_TAG" ]]; then
  LOG=$(git log "${LAST_TAG}..HEAD" --oneline --no-decorate 2>/dev/null || true)
else
  LOG=$(git log --oneline --no-decorate 2>/dev/null || true)
fi

# ── Group by conventional commit prefix ────────────────────────────────────
section() {
  local label=$1 prefix=$2
  local lines
  lines=$(printf '%s\n' "$LOG" | grep -E "^[0-9a-f]+ ${prefix}:" | sed "s/^[0-9a-f]* ${prefix}: /- /" || true)
  [[ -n "$lines" ]] && printf "### %s\n%s\n\n" "$label" "$lines"
}

OTHER=$(printf '%s\n' "$LOG" | grep -Ev "^[0-9a-f]+ (feat|fix|docs|chore):" | sed 's/^[0-9a-f]* /- /' || true)

# ── Build changelog entry ───────────────────────────────────────────────────
TODAY=$(date +%Y-%m-%d)
ENTRY_FILE=$(mktemp)

{
  printf "## v%s — %s\n\n" "$NEW" "$TODAY"
  section "Features"  "feat"
  section "Fixes"     "fix"
  section "Docs"      "docs"
  section "Chores"    "chore"
  [[ -n "$OTHER" ]] && printf "### Other\n%s\n\n" "$OTHER"
  printf "---\n\n"
} > "$ENTRY_FILE"

# ── Prepend to CHANGELOG.md ─────────────────────────────────────────────────
CHANGELOG="CHANGELOG.md"
MERGED=$(mktemp)
if [[ -f "$CHANGELOG" ]]; then
  cat "$ENTRY_FILE" "$CHANGELOG" > "$MERGED"
else
  { printf "# Changelog\n\n"; cat "$ENTRY_FILE"; } > "$MERGED"
fi
mv "$MERGED" "$CHANGELOG"
rm -f "$ENTRY_FILE"
echo "  CHANGELOG.md updated"

# ── Commit and tag ──────────────────────────────────────────────────────────
git add package.json "$CHANGELOG"
git commit -m "Release v${NEW}"
git tag -a "v${NEW}" -m "v${NEW}"
echo "  committed and tagged v${NEW}"
echo ""
echo "Push with:"
echo "  git push origin main && git push origin v${NEW}"
