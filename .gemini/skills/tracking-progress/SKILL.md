---
name: tracking-progress
description: Reviewing project documentation (blueprints, changelogs) for pending tasks, verifying their status in the codebase, and updating task lists.
---

# Tracking Progress

## Overview

This skill automates the synchronization between project documentation and the codebase. It scans markdown files (specifically blueprints and changelogs) for pending task lists (`- [ ]`), verifies whether the described tasks have been implemented in the codebase, and updates the documentation to reflect completion (`- [x]`).

## Triggers

- "Check project progress"
- "Update task status in docs"
- "Review blueprints for completed items"
- "Syncing project documentation with code"
- "Auditing blueprints for progress"

## Workflow

Copy this checklist and check off items as you complete them:
```text
Verification Progress:
- [ ] Step 1: Identify target documents (blueprints, changelogs)
- [ ] Step 2: Scan for pending tasks (- [ ]) in each file
- [ ] Step 3: Verify implementation in codebase (files, symbols, deps)
- [ ] Step 4: Update completed tasks (- [x]) in documentation
- [ ] Step 5: Report summary of updates and pending items
```

### 1. Identify Target Documents

Use `glob` to find relevant markdown files:
- `docs/blueprints/*.md`
- `docs/changelog/*.md`

### 2. Scan for Pending Tasks

For each file, read the content and identify lines starting with `- [ ]`. Extract the task description.

### 3. Verify Implementation

For each pending task, use heuristic analysis to determine if it is complete:

- **File Creation:** If the task mentions creating a file (e.g., "Create `src/components/CoinCard.tsx`"), check if the file exists using `ls` or `glob`.
- **Symbol Implementation:** If the task mentions a function, class, or hook (e.g., "Implement `useCoins` hook"), use `grep_search` to find its definition in the codebase.
- **Dependency Installation:** If the task mentions installing a package (e.g., "Install `zod`"), check `package.json`.
- **General Logic:** If the task describes a feature (e.g., "Global Search"), look for relevant component files (e.g., `SearchBar.tsx`) or logic.

### 4. Update Documentation

If a task is verified as complete:
1.  Read the file content again to ensure freshness.
2.  Use `replace` to change the specific line from `- [ ] Task description` to `- [x] Task description`.
3.  Log the update.

### 5. Report

After processing all files, provide a summary of:
- Files scanned
- Tasks verified and updated
- Tasks that remain pending (and why, if verification failed)

## Safety & Accuracy

- **Conservative Updates:** Only mark a task as complete if there is clear code evidence. If ambiguous, leave it as pending.
- **Exact Matching:** Ensure `replace` targets the exact string to avoid accidental edits.
