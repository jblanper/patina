---
name: saving-context
description: Analyzes recent code changes, feature discussions, and workspace state to generate a structured context snapshot. Use when the user asks to "save context", "document changes", "create a save point", or mentions they are about to clear the CLI session.
---

# Context Saver

You are tasked with documenting the current state of the user's workspace so they can safely clear their CLI context and resume work later without losing their train of thought.

## Context Saving Workflow
Copy this checklist into your internal scratchpad and check off items as you complete them:

```text
Task Progress:
- [ ] Step 1: Analyze recent context
- [ ] Step 2: Read the document template
- [ ] Step 3: Generate the changelog content
- [ ] Step 4: Save the file to docs/changelog/
- [ ] Step 5: Stage the new file in Git
- [ ] Step 6: Confirm completion
```
## Step 1: Analyze recent context
Review the recent conversation history. Use your built-in tools (like git diff, git status, or reading recently modified files) to identify exactly what has been built, changed, or discussed during this session.

## Step 2: Read the document template
Read the format requirements from assets/doc-template.md.

## Step 3: Generate the changelog content
Synthesize the context you gathered in Step 1 and format it strictly according to the structure provided in the template.

## Step 4: Save the file to docs/changelog/
Save the generated content to a new markdown file.

Directory: docs/changelog/ (Create this directory if it does not exist).

Naming Convention: YYYY-MM-DD-brief-feature-name.md (e.g., 2026-03-12-auth-middleware-refactor.md).

## Step 5: Stage the new file in Git
Run the appropriate command to stage the newly created document (e.g., git add docs/changelog/<filename>).

## Step 6: Confirm completion
Output a brief, encouraging confirmation message to the user indicating the exact file path where the context was saved and confirming it was staged in Git. Prompt them that it is now safe to run their CLI's clear command (e.g., /clear).