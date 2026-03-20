---
name: debug
description: Structured debugging session — reproduce, isolate, fix, and document any bug. Always produces a report saved to docs/debug/ with a datetime-stamped filename.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Debug

Structured debugging for a specific bug or unexpected behaviour.

Usage: `/debug [brief description of the bug]`

If no description is provided, ask: "What behaviour are you seeing and what did you expect?"

---

## Workflow checklist

Copy this checklist into your response and check off each phase as you complete it. Do not stop until all phases are marked done.

```
Debug progress:
- [ ] Phase 1 — Understand (classify, locate, check project guide)
- [ ] Phase 2 — Reproduce (dev server, reproduction steps)
- [ ] Phase 3 — Isolate (hypothesis, verify, quote offending code)
- [ ] Phase 4 — Fix (edit, lint/test/build, scope check)
- [ ] Phase 5 — Document (console summary + report file)
- [ ] Phase 6 — Stop dev server
```

---

## Phase 1 — Understand

Before touching any code, gather facts.

1. **State the bug clearly** — write a one-sentence description:
   > "When [trigger], [component] does [actual behaviour] instead of [expected behaviour]."

2. **Classify the bug** (examples — adapt to the project's domain):
   - `runtime` — crash, error, or exception at runtime
   - `ui` — wrong visual output (layout, colour, animation, text)
   - `logic` — wrong data, wrong calculation, wrong state transition
   - `navigation` — wrong route, back-stack issue, URL mismatch
   - `storage` — data persistence read/write gone wrong, stale data, key mismatch
   - `animation` — jank, snap, wrong timing, wrong exit/enter sequence
   - `network` — failed request, wrong payload, unexpected response
   - `auth` — session, token, or permission issue

3. **Locate the relevant code.** Scan the project structure first (`Glob` the top-level directories), then narrow to the files most likely involved based on the bug class and description. Use Grep and Glob. Read only the files that are plausibly involved — do not read the full codebase speculatively.

4. **Check the project guide for prior art.** Grep CLAUDE.md (or equivalent project guide) for the component name and the bug class. Prior incidents are often documented in implementation notes. If a known pattern applies, cite it in the report.

---

## Phase 2 — Reproduce

Establish a minimal reproduction path: the smallest sequence of steps that reliably triggers the bug.

1. Identify the dev server command from `package.json`, `Makefile`, or project docs, then start it if not already running. Wait for it to be ready before proceeding.

2. Walk through the reproduction steps, noting:
   - What state must exist first (e.g. specific data, a particular config, a logged-in user)
   - The exact user action that triggers the bug
   - What the app does vs. what it should do

3. Record the reproduction steps as a numbered list. If the bug cannot be reproduced reliably, note that explicitly and proceed with static analysis only.

---

## Phase 3 — Isolate

Narrow to the exact cause before writing any fix.

1. **Read the relevant code** — the component, the utility, or the route identified in Phase 1.

2. **Form a hypothesis** — state what you believe the root cause is. Be specific: name the file, the function or block, and the mechanism that causes the wrong behaviour.

3. **Verify the hypothesis** — confirm by reading the exact line(s) responsible. Quote the offending code in the report.

4. **List what you tried** — if any hypothesis was ruled out, record it so future debugging does not retread the same ground.

---

## Phase 4 — Fix

Apply the minimal fix. Do not refactor surrounding code.

1. Edit only the files the bug touches. If a fix requires touching more than 3 files, pause and explain why before proceeding.

2. After fixing, run the project's standard check suite (lint, tests, build — detect the commands from `package.json` scripts or project docs). All checks must pass before the fix is considered complete. If any fail, resolve the failure before proceeding.

3. Verify the fix resolves the reproduction path from Phase 2.

4. **Scope check** — consider whether the same root cause could exist elsewhere in the codebase. Search broadly for the pattern and report any additional instances found. Fix them if safe; flag them if uncertain.

---

## Phase 5 — Document

Always produce a report, even if the bug was not reproducible or not fixed.

### Console summary

Print this block to the terminal before writing the report file:

```
── Debug session ────────────────────────────────────────────
Bug:        [one-sentence description]
Class:      [classification]
Status:     [Fixed | Partially fixed | Not reproducible | Needs more info]
Files changed: [list, or "None"]
Root cause: [one sentence]
─────────────────────────────────────────────────────────────
```

### Report file

Run `date '+%Y-%m-%d_%H-%M'` to get the datetime stamp for the filename.

Save the report to a **new file**:
```
docs/debug/YYYY-MM-DD_HH-MM_[slug].md
```
where `[slug]` is a 2–4 word kebab-case description of the bug
(e.g. `exit-animation-snap`, `date-offset-mismatch`, `null-pointer-login`).

Create `docs/debug/` if it does not exist.

The report file contents:

```markdown
# Debug report — [Brief bug title]

**Date:** YYYY-MM-DD HH:MM
**Class:** [classification]
**Status:** [Fixed | Partially fixed | Not reproducible | Needs more info]

## Bug

[One-sentence description: "When X, Y does Z instead of W."]

## Reproduction steps

1. [Step]
2. [Step]
3. [Observed: … / Expected: …]

## Root cause

[Exact explanation. Quote the offending code.]

## What was tried

- [Hypothesis ruled out and why, or "N/A — root cause identified immediately"]

## Fix

[What was changed and why. Reference the file and line numbers.
If not fixed, explain what information is still needed.]

## Scope check

[Were any additional instances of the same root cause pattern found elsewhere?
What was searched and what was the result.]

## Project guide update

[Updated — rule added: "…" / Not needed — existing rule covers this / Already documented]
```

If a **project guide update** is needed, update the relevant guide file (e.g. `CLAUDE.md`) immediately in the relevant component notes or coding standards section. Do not leave it as a "should do" — update it now.

---

## Phase 6 — Stop the dev server

Kill any dev server started in Phase 2 using the appropriate command for the project (e.g. kill by port, by process name, or by PID captured at startup).

---

Tell the user:
> "Debug session complete. Status: [Fixed / Not reproducible / Needs more info].
>
> Report saved to docs/debug/YYYY-MM-DD_HH-MM_[slug].md.
> [If project guide was updated]: Project guide updated with the new rule.
> [If further action needed]: Next step: [specific action]."
