# Explanation: The Curator's Automation

The Patina project utilizes a specialized set of Gemini CLI extensions to ensure that every technical decision adheres to our core philosophy of museum-grade aesthetics and numismatic integrity.

## Why Automation?

At its core, Patina is a sanctuary for historical objects. Standard software development tools often prioritize speed and "tech-first" dashboards, which can clash with the somber, tactile experience of a numismatic gallery. Our automation layer acts as a **Digital Curator**, enforcing standards that would otherwise require constant manual auditing.

## The Digital Curator's Guardrails

The extension layer is built on two pillars of specialized oversight:

1.  **Domain-Specific Agents:** Skilled specialists ensure system integrity across security, quality, numismatics, UI, and documentation.
2.  **Automated Quality Hooks:** Background scripts provide real-time feedback—schema context, build status, and style compliance—after every tool call.

## From Idea to Blueprint

Before a feature enters the blueprint lifecycle, rough ideas live in the **Ideas Under Discussion** section of `docs/technical_plan.md`. The `scouting-ideas` skill turns these into research reports: it searches the competitive landscape, numismatic community forums, and relevant standards, then saves a structured report to `docs/research/`. That report feeds directly into Phase 0 of `curating-blueprints`.

## The Blueprint Lifecycle

Every feature follows a strict lifecycle that enforces architectural integrity through mandatory multi-disciplinary audits at both the **Design** and **Implementation** stages. This prevents drift from our "Curator-First" philosophy and the "Single-Click Rule".

<span id="blueprint-lifecycle"></span>

The lifecycle is managed by the `curating-blueprints` skill with seven possible states:

| State | Purpose |
|:------|:--------|
| **Draft** | Initial research and design |
| **Proposed** | Ready for Design-phase audits |
| **Approved** | Audits passed, user approved |
| **In-Progress** | Implementation underway |
| **Verification** | Ready for Implementation-phase audits |
| **Completed** | Final audits passed, feature merged |
| **Archived** | Superseded or abandoned |

For the complete technical reference, see [Reference: CLI Extensions](./reference/cli_extensions.md).

## Maintaining Standards

All extensions are audited against the **AgentSkills.io Open Standard** using the `evaluating-skills` tool. This ensures our automation remains maintainable, secure, and aligned with the "Curator-First" experience.

## Related resources
- [How-to: Manage CLI Extensions](./how-to/manage_cli_extensions.md)
- [Reference: CLI Extensions](./reference/cli_extensions.md)
- [The Patina Style Guide](./style_guide.md)
