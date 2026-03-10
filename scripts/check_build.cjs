const { execSync } = require('child_process');

/**
 * Patina Build Status Hook
 * Runs tsc to check for type errors and provides context to the agent.
 */

try {
  // Run tsc (TypeScript Compiler)
  // We use --noEmit because we only care about the type check in this hook
  execSync('npx tsc --noEmit', { stdio: 'pipe' });

  const output = {
    hookSpecificOutput: {
      additionalContext: "Build Status: All TypeScript checks passed. The codebase is type-safe."
    },
    systemMessage: "Build check: OK"
  };

  process.stdout.write(JSON.stringify(output));

} catch (err) {
  // If tsc fails, it will throw an error with the output in err.stdout
  const errorOutput = err.stdout ? err.stdout.toString() : err.message;
  
  const output = {
    hookSpecificOutput: {
      additionalContext: `Build Status: Type errors detected!\n\n${errorOutput.slice(0, 1000)}` // Truncate to avoid context bloat
    },
    systemMessage: "Build check: FAILED"
  };

  process.stdout.write(JSON.stringify(output));
}
