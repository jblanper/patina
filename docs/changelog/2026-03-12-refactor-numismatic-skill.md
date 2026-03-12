# Context Snapshot: Refactor Numismatic Skill & Document Centralization
**Date:** 2026-03-12

## High-Level Summary
This session focused on auditing and improving the `numismatic-researcher` skill according to the AgentSkills.io standard. We renamed it to `curating-coins` (gerund form), enhanced its `SKILL.md` with triggers and checklists, and centralized all skill documentation in `docs/workflows_and_skills.md` while streamlining `README.md` and `GEMINI.md`.

## Key Code Changes
* `.gemini/skills/curating-coins/`: Renamed from `numismatic-researcher` and updated `SKILL.md` with triggers, a copyable workflow checklist, and improved metadata.
* `README.md`: Removed the "Development with Gemini CLI" section to reduce redundancy and simplify the top-level project overview.
* `GEMINI.md`: Replaced detailed skill descriptions with a reference to `docs/workflows_and_skills.md` to maintain focus on core engineering mandates.
* `docs/workflows_and_skills.md`: Updated to include `curating-coins` and added descriptions for `evaluating-skills`, `writing-tech-docs`, and `saving-context`.

## Architectural Decisions & Context
* **Skill Naming Convention:** Adhered to the mandatory gerund form for all skill names to ensure consistency and professional tone across the project.
* **Documentation Strategy:** Centralized all CLI-specific documentation (skills, hooks, sub-agents) in a single technical reference file (`docs/workflows_and_skills.md`) to keep primary project files focused and maintainable.

## Next Steps / Unresolved Issues
* [ ] Verify the `curating-coins` skill in a live cataloging task to ensure the new triggers and checklist are effective.
* [ ] Consider implementing the `patina-release` skill as proposed in the future extensions section of `docs/workflows_and_skills.md`.
