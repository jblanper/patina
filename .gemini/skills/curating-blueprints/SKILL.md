---
name: curating-blueprints
description: Standardizes the creation and review lifecycle of Implementation Blueprints for the Patina project. Use when initiating new features, performing multi-disciplinary audits (securing-electron, curating-coins, curating-ui), or documenting post-implementation retrospectives to ensure project-wide alignment.
---

# Curating Blueprints

This skill manages the lifecycle of **Implementation Blueprints**, which serve as the definitive plan and audit trail for all significant technical changes in the Patina project.

## Workflow

### Progress Checklist
Use this checklist to track the lifecycle of a blueprint:
```text
Blueprint Lifecycle:
- [ ] 1. Initiation: Created `docs/blueprints/YYYY-MM-DD-title.md` from template.
- [ ] 2. Audit: Security Assessment (`securing-electron`) completed.
- [ ] 3. Audit: Numismatic Assessment (`curating-coins`) completed.
- [ ] 4. Audit: UI Assessment (`curating-ui`) completed.
- [ ] 5. Execution: Technical tasks implemented and verified.
- [ ] 6. Retrospective: Post-implementation review and core doc revision completed.
```

### 1. Initiation
When starting a new feature or task, create a new blueprint file in `docs/blueprints/YYYY-MM-DD-title.md` using the template in `assets/blueprint_template.md`.

- **Objective:** Clearly state the goal.
- **Technical Tasks:** Break down the implementation into atomic, verifiable steps.
- **Verification Strategy:** Define how the work will be validated (tests, visual checks).

### 2. Multi-Disciplinary Audits
Before implementation begins (or during development), trigger audits from specialized agents by updating the corresponding sections in the blueprint:

- **Security Assessment:** Activate `securing-electron` to audit IPC, database, and process isolation.
- **Numismatic Assessment:** Activate `curating-coins` to verify historical accuracy, catalog standards, and metric precision.
- **UI Assessment:** Activate `curating-ui` to audit compliance with the "Manuscript Hybrid" aesthetic and `docs/style_guide.md`.

### 3. Execution & Verification
Follow the blueprint's tasks and verification strategy. Ensure all findings from the audits are addressed in the implementation.

### 4. Post-Implementation Retrospective
Once the work is verified, complete the **Post-Implementation Retrospective** section.

#### Core Document Revision
A critical step of the retrospective is to review and, if necessary, update the project's foundation:
- **`GEMINI.md`:** Update engineering mandates if new standards or patterns were established.
- **`docs/style_guide.md` & `docs/style_guide.html`:** Refine styling rules, CSS variables, or component patterns based on implementation lessons.

## Assets
- `assets/blueprint_template.md`: The standard markdown structure for all blueprints.
