---
name: evaluating-skills
description: Evaluates Agent Skills against the AgentSkills.io Open Standard. Use when asked to review or lint a skill directory, SKILL.md file, or bundled scripts for compatible clients like Claude Code, Roo Code, Gemini CLI, or Cursor.
---

# Agent Skill Evaluation

This skill reviews AI Agent Skills to ensure they adhere to the open standard (AgentSkills.io). Proper adherence ensures high token efficiency, seamless cross-platform interoperability, and proper progressive disclosure.

## Quick Start
To evaluate a target skill, follow the workflow below. 

- Use [references/EVALUATION_CRITERIA.md](references/EVALUATION_CRITERIA.md) for strict grading rules.
- **If the skill contains scripts**, evaluate them using [references/SCRIPT_EVALUATION.md](references/SCRIPT_EVALUATION.md).
- Use [assets/REPORT_TEMPLATE.md](assets/REPORT_TEMPLATE.md) to generate a structured feedback report.

## Evaluation Workflow
Copy this checklist and check off items as you complete them:
```text
Evaluation Progress:
- [ ] Step 1: Analyze metadata
- [ ] Step 2: Assess conciseness and tone
- [ ] Step 3: Check progressive disclosure architecture
- [ ] Step 4: Evaluate workflows and feedback loops
- [ ] Step 5: Detect and evaluate bundled scripts
- [ ] Step 6: Verify cross-platform interoperability
- [ ] Step 7: Generate structured feedback report
```

### Step 1: Analyze metadata
Read the target SKILL.md frontmatter. Verify name formatting, description length, and character constraints.

### Step 2: Assess conciseness and tone
Check if the skill over-explains basic concepts. Verify that descriptions use a 3rd-person point of view.

### Step 3: Check progressive disclosure
Ensure details are split into separate files. Verify that reference links are exactly one level deep from SKILL.md and long files have tables of contents.

### Step 4: Evaluate workflows
Look for explicit checklists for multi-step tasks.

### Step 5: Detect and evaluate bundled scripts
Check if the target skill directory contains a scripts/ folder or .py/.bash/.js files. If it does, read SCRIPT_EVALUATION.md and evaluate the code. If not, skip this step.

### Step 6: Verify cross-platform compatibility
If the skill includes installation instructions, verify it correctly mentions standard installation paths for the target CLI (e.g., .gemini/skills/, .claude/skills/, or the universal .agents/skills/).

### Step 7: Generate structured feedback report
Read assets/REPORT_TEMPLATE.md and use its exact structure to output your final findings to the user.