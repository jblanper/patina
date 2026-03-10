const { execSync } = require('child_process');

/**
 * Patina Lint Status Hook
 * Runs eslint to check for code style and potential errors.
 */

try {
  // Run eslint on src directory
  execSync('npx eslint src --ext .ts,.tsx,.js,.jsx --quiet', { stdio: 'pipe' });

  const output = {
    hookSpecificOutput: {
      additionalContext: "Lint Status: All linting checks passed. Code follows standards."
    },
    systemMessage: "Lint check: OK"
  };

  process.stdout.write(JSON.stringify(output));

} catch (err) {
  // If eslint fails, it will throw an error with the output in err.stdout
  const errorOutput = err.stdout ? err.stdout.toString() : err.message;
  
  const output = {
    hookSpecificOutput: {
      additionalContext: `Lint Status: Linting errors detected!\n\n${errorOutput.slice(0, 1000)}`
    },
    systemMessage: "Lint check: FAILED"
  };

  process.stdout.write(JSON.stringify(output));
}
