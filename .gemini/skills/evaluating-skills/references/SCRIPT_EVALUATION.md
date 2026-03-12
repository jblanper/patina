# Script Evaluation Criteria

When a skill includes bundled scripts, those scripts must be designed to work seamlessly with an LLM agent operating in a terminal (like Claude Code or Gemini CLI). 

## 1. Clear Interfaces (Degrees of Freedom)
- **Low Freedom Tasks**: Fragile operations (e.g., DB migrations) should require few or no parameters to prevent the agent from making mistakes.
- **Medium Freedom Tasks**: Flexible scripts must use clear, standard CLI arguments (e.g., `argparse` in Python, standard flags in Bash) so the agent knows exactly how to pass configurations.

## 2. LLM-Friendly Error Handling (Feedback Loops)
- **Descriptive Errors**: Scripts must not fail silently. They must output clear, descriptive error messages to `stderr` or `stdout` so the agent can read the error, understand what went wrong, and attempt to fix it.
- **Validation**: Scripts designed to check work must clearly state what failed and suggest how the agent should fix it.

## 3. Environment & Sandbox Awareness
- **Cross-Platform**: Scripts should ideally use standard cross-platform paths (forward slashes `/`) or handle OS-specific pathing gracefully.
- **Execution Context**: Scripts must not assume they are running interactively. They should not use `read` prompts or require user keystrokes (unless specifically testing an interactive flow).

## 4. Idempotency & Safety
- **Safe Retries**: Because Claude operates in a loop (Run -> Fail -> Fix -> Run), scripts should ideally be idempotent (safe to run multiple times without corrupting state) or have a clear rollback mechanism.
- **Dry Runs**: For destructive or permanent operations, the script should ideally support a `--dry-run` or `--verify` flag.

## 5. Dependencies
- **Simplicity**: Scripts should rely on standard libraries where possible.
- **Documentation**: External dependencies must be clearly documented in the skill so the agent knows to install them.