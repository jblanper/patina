# The Three-Path Protocol

For any UI task, you MUST propose **3 distinct alternatives** to ensure a thorough exploration of the aesthetic defined in `docs/style_guide.md`.

## Delivery Requirements
- **Format:** A single, self-contained HTML mockup file in `docs/curating-ui/`.
- **Naming Convention:** `proposal_[component_name]_[YYYY-MM-DD_HHmm].html`.
- **Template:** Use `skills/curating-ui/assets/proposal_template.html` as the structural foundation.
- **Styling:** ALWAYS use the latest CSS variables and typography from `docs/style_guide.html`.

## Mockup Content Checklist
Each proposal within the mockup MUST include:

1.  **Narrative Reasoning:** A curatorial rationale for each path, explaining how it serves the "Curator-First" experience.
2.  **Accessibility Audit:** Explicit report on WCAG contrast ratios and focus indicators (essential for senior collectors).
3.  **Empty State Logic:** Visual representation of how the component handles missing or loading data.
4.  **State Exhaustion:** Visual states for:
    - Idle
    - Hover
    - Focus
    - Active
    - Error
    - Disabled
5.  **Interactivity:** Use simple CSS transitions or minimal JavaScript to demonstrate the "feel" of the interaction.

## The Three Paths
While specific to the task, the paths generally follow these archetypes:
- **Path A (The Minimalist):** Maximum whitespace, hidden controls, absolute focus on the object.
- **Path B (The Ledger):** A more information-dense, archival approach with visible metadata.
- **Path C (The Hybrid):** A balanced approach often utilizing innovative progressive disclosure.
