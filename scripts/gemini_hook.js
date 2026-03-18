const { execSync } = require('child_process');

/**
 * Patina Universal Hook Wrapper
 * 
 * Usage: node scripts/gemini_hook.js <npm-script-name>
 * 
 * 1. Checks if source code (.ts, .tsx, .js, .jsx) has changed.
 * 2. If no code changed, exits silently with {}.
 * 3. If code changed, runs 'npm run <npm-script-name>'.
 * 4. Captures output and returns a clean JSON object for Gemini CLI.
 */

const command = process.argv[2];

if (!command) {
  process.stderr.write('Error: No command provided.\n');
  process.exit(1);
}

try {
  // 1. Check for source code changes
  const changedFiles = execSync("git status --porcelain | grep -E '\\.(ts|tsx|js|jsx)$' || true", { encoding: 'utf8' }).trim();
  
  if (!changedFiles) {
    // No relevant files changed, exit silently with valid JSON
    process.stdout.write(JSON.stringify({}));
    process.exit(0);
  }

  // 2. Run the npm script
  // We use stdio: 'pipe' to capture output for the JSON response
  try {
    execSync(`npm run ${command}`, { stdio: 'pipe', encoding: 'utf8' });

    const output = {
      systemMessage: `${command}: OK`,
      hookSpecificOutput: {
        additionalContext: `${command} passed successfully.`
      }
    };
    process.stdout.write(JSON.stringify(output));

  } catch (err) {
    // If command fails, capture the error output (stdout + stderr)
    const errorLog = err.stdout ? err.stdout.toString() : err.message;
    
    const output = {
      systemMessage: `${command}: FAILED`,
      hookSpecificOutput: {
        additionalContext: `${command} failed with the following errors:\n\n${errorLog.slice(0, 1500)}`
      }
    };
    process.stdout.write(JSON.stringify(output));
    // We exit 0 so Gemini CLI receives the JSON feedback instead of a generic "hook failed" error
    process.exit(0);
  }

} catch (err) {
  process.stderr.write(`Hook Wrapper Error: ${err.message}\n`);
  process.exit(1);
}
