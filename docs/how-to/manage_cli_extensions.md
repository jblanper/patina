# How to Manage Gemini CLI Extensions

This guide shows you how to view, refresh, and install the specialized skills that automate the Patina development workflow.

## Prerequisites
- You must have the [Gemini CLI](https://github.com/google/gemini-cli) installed and configured in your workspace.

## Steps

1. **List all active skills**:
   Use this command to view all specialized skills currently available to the agent.
   ```bash
   /skills list
   ```

2. **Reload skill definitions**:
   Refresh the agent's knowledge of the skills stored in the `.gemini/skills/` directory after making changes to a `SKILL.md` file.
   ```bash
   /skills reload
   ```

3. **Install a new skill**:
   Use the built-in `skill-creator` to bootstrap a new skill directory with the required structure.
   ```bash
   /activate_skill name="skill-creator"
   ```

## Troubleshooting
- **Skill not appearing**: Ensure the skill's `SKILL.md` or metadata file exists in the `.gemini/skills/` subdirectory and run `/skills reload`.
- **Command not recognized**: Ensure you are currently inside a Gemini CLI session and that the `.gemini/` folder is in the root of your project.

## Related resources
- [Reference: CLI Extensions](../reference/cli_extensions.md)
- [Explanation: The Curator's Automation](../workflows_and_skills.md)
