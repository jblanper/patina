const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/main/preload.ts');

if (!fs.existsSync(filePath)) {
  console.error(`Error: Could not find ${filePath}`);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');

const securityChecks = [
  {
    name: 'Exposing ipcRenderer directly',
    regex: /exposeInMainWorld\(.*ipcRenderer.*\)/i,
    expected: false,
  },
  {
      name: 'Exposing Electron modules directly',
      regex: /exposeInMainWorld\(.*require\(.*['"]electron['"]\).*\)/i,
      expected: false,
  },
];

console.log('--- Preload Bridge Security Audit ---');
let allPassed = true;

securityChecks.forEach((check) => {
  const failed = check.regex.test(content);
  if (failed !== check.expected) {
    console.log(`[FAIL] ${check.name} - Potentially dangerous exposure found.`);
    allPassed = false;
  } else {
    console.log(`[PASS] ${check.name}`);
  }
});

if (!allPassed) {
  process.exit(1);
} else {
  console.log('--- Audit Completed Successfully ---');
}
