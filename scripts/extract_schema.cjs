const fs = require('fs');
const path = require('path');

/**
 * Patina Database Schema Extractor Hook
 * This script parses src/common/schema.ts to provide a structured
 * summary of database tables to the Gemini CLI.
 */

const SCHEMA_PATH = path.join(__dirname, '../src/common/schema.ts');

try {
  if (!fs.existsSync(SCHEMA_PATH)) {
    process.stderr.write(`Error: ${SCHEMA_PATH} does not exist\n`);
    process.exit(1);
  }

  const content = fs.readFileSync(SCHEMA_PATH, 'utf8');
  
  // Extract table names and columns from the SCHEMA object in schema.ts
  // This is a more robust regex-based approach for the structured TS file
  const tables = [];
  const tableRegex = /name:\s*'(\w+)',\s*columns:\s*\[([\s\S]*?)\]/g;
  let tableMatch;

  while ((tableMatch = tableRegex.exec(content)) !== null) {
    const tableName = tableMatch[1];
    const columnsContent = tableMatch[2];
    const columnRegex = /name:\s*'(\w+)'/g;
    let columnMatch;
    const columns = [];
    
    while ((columnMatch = columnRegex.exec(columnsContent)) !== null) {
      columns.push(columnMatch[1]);
    }
    
    tables.push(`Table: ${tableName} (${columns.join(', ')})`);
  }

  if (tables.length === 0) {
    process.stderr.write('Error: Could not find SCHEMA definition in src/common/schema.ts\n');
    process.exit(1);
  }

  const contextMessage = `--- Current Database Schema Summary (Structured) ---\n${tables.join('\n')}\n---------------------------------------------------`;

  const output = {
    hookSpecificOutput: {
      additionalContext: contextMessage
    },
    systemMessage: "Database schema context loaded from structured schema."
  };

  process.stdout.write(JSON.stringify(output));

} catch (err) {
  process.stderr.write(`Error reading schema: ${err.message}\n`);
  process.exit(1);
}
