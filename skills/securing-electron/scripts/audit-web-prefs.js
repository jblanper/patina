const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/main/index.ts');

if (!fs.existsSync(filePath)) {
  console.error(`Error: Could not find ${filePath}`);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');

const securityChecks = [
  {
    name: 'nodeIntegration: false',
    regex: /nodeIntegration:\s*false/i,
    expected: true,
  },
  {
    name: 'contextIsolation: true',
    regex: /contextIsolation:\s*true/i,
    expected: true,
  },
  {
    name: 'sandbox: true',
    regex: /sandbox:\s*true/i,
    expected: true,
  },
  {
    name: 'webSecurity override (should be true or default)',
    regex: /webSecurity:\s*false/i,
    expected: false,
  },
  {
    name: 'experimentalFeatures enabled',
    regex: /experimentalFeatures:\s*true/i,
    expected: false,
  },
  {
    name: 'blinkFeatures enabled',
    regex: /blinkFeatures:\s*true/i,
    expected: false,
  },
];

console.log('--- WebPreferences Security Audit ---');
let allPassed = true;

securityChecks.forEach((check) => {
  const passed = check.regex.test(content);
  if (passed === check.expected) {
    console.log(`[PASS] ${check.name}`);
  } else {
    console.log(`[FAIL] ${check.name} - Potentially dangerous setting found.`);
    allPassed = false;
  }
});

if (!allPassed) {
  process.exit(1);
} else {
  console.log('--- Audit Completed Successfully ---');
}
