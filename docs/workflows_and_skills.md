# Explanation: The Curator's Automation

The Patina project utilizes a specialized set of Gemini CLI extensions to ensure that every technical decision adheres to our core philosophy of museum-grade aesthetics and numismatic integrity.

## Why Automation?

At its core, Patina is a sanctuary for historical objects. Standard software development tools often prioritize speed and "tech-first" dashboards, which can clash with the somber, tactile experience of a numismatic gallery. Our automation layer acts as a **Digital Curator**, enforcing specific standards that would otherwise require constant manual auditing.

## The Digital Curator's Guardrails

The extension layer is built on three pillars of specialized oversight:

1.  **Technical Guardrails:** Domain-specific agents ensure system integrity at every step.
    -   **`securing-electron`**: Enforces "The Filter" principle, mandating strict Zod validation for all IPC communication.
    -   **`assuring-quality`**: Enforces the "Colocation Rule" and strict coverage mandates (e.g., 100% branch coverage for validation).
    -   **`curating-coins`**: Ensures technical numismatic accuracy, such as recording weights to exactly two decimal places and using proper catalog references (RIC, RPC).
    -   **`curating-ui`**: Manages the archival ledger aesthetic through the "Three-Path Protocol" and interactive mockups.
    -   **`writing-tech-docs`**: Enforces the Diátaxis framework for all project documentation.
2.  **Automated Quality Hooks:** These background scripts provide real-time feedback. After every tool call, the agent receives a "Context Update" containing the latest database schema, build status, and design system compliance reports.
3.  **The Design Lifecycle:** Through the `curating-blueprints` skill, we enforce a strict 7-stage lifecycle (from **Draft** to **Archived**) that mandates multi-disciplinary audits at both the **Proposed** (Design) and **Verification** (Implementation) stages.
4.  **Workflow Automation:** Utility skills that reduce cognitive load by managing session state (`saving-context`) and syncing documentation with code (`tracking-progress`).

## The Blueprint Lifecycle

To maintain architectural integrity, every feature follows a strict lifecycle managed by the `curating-blueprints` skill:

1.  **Draft:** Initial research, design, and writing.
2.  **Proposed:** Ready for multi-disciplinary audits (Design Phase).
3.  **Approved:** Audits passed, user approved.
4.  **In-Progress:** Implementation has begun.
5.  **Verification:** Implementation complete; ready for final audits (Implementation Phase).
6.  **Completed:** Final audits passed; feature merged.
7.  **Archived:** Old, superseded, or abandoned.

## Maintaining Standards

All extensions are audited against the **AgentSkills.io Open Standard** using the `evaluating-skills` tool. This ensures that our automation remains maintainable, secure, and aligned with the "Curator-First" experience.

## Related resources
- [How-to: Manage CLI Extensions](./how-to/manage_cli_extensions.md)
- [Reference: CLI Extensions](./reference/cli_extensions.md)
- [The Patina Style Guide](./style_guide.md)
