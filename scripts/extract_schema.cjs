const fs = require('fs');
const path = require('path');

/**
 * Patina Database Schema Extractor Hook
 * This script parses src/main/db.ts and outputs a JSON object 
 * for the Gemini CLI to inject as session context.
 */

const DB_PATH = path.join(__dirname, '../src/main/db.ts');

try {
  if (!fs.existsSync(DB_PATH)) {
    process.stderr.write(`Error: ${DB_PATH} does not exist\n`);
    process.exit(1);
  }

  const content = fs.readFileSync(DB_PATH, 'utf8');
  const execMatch = content.match(/db\.exec\(`([\s\S]*?)`\)/);
  
  if (!execMatch) {
    process.stderr.write('Error: Could not find db.exec call in src/main/db.ts\n');
    process.exit(1);
  }

  const sql = execMatch[1];
  const summary = sql
    .split(';')
    .map(statement => {
      const tableMatch = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\)/);
      if (tableMatch) {
        const tableName = tableMatch[1];
        const columns = tableMatch[2]
          .split(',')
          .map(col => col.trim().split(/\s+/)[0])
          .filter(name => name && !name.startsWith('FOREIGN') && !name.startsWith('PRIMARY'));
        
        return `Table: ${tableName} (${columns.join(', ')})`;
      }
      return null;
    })
    .filter(Boolean)
    .join('\n');

  const contextMessage = `--- Current Database Schema Summary ---\n${summary}\n---------------------------------------`;

  // MUST output exactly one JSON object to stdout
  const output = {
    hookSpecificOutput: {
      additionalContext: contextMessage
    },
    systemMessage: "Database schema context loaded."
  };

  process.stdout.write(JSON.stringify(output));

} catch (err) {
  process.stderr.write(`Error reading schema: ${err.message}\n`);
  process.exit(1);
}
