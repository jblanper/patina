const fs = require('fs');
const path = require('path');

/**
 * Patina Database Schema Extractor
 * This script parses src/main/db.ts to provide a live summary of the 
 * current database structure for the Gemini CLI context.
 */

const DB_PATH = path.join(__dirname, '../src/main/db.ts');

try {
  const content = fs.readFileSync(DB_PATH, 'utf8');
  
  // Extract the content inside db.exec(`...`)
  const execMatch = content.match(/db\.exec\(`([\s\S]*?)`\)/);
  
  if (!execMatch) {
    console.log('Error: Could not find db.exec call in src/main/db.ts');
    process.exit(1);
  }

  const sql = execMatch[1];
  
  // Clean up and summarize the SQL for context efficiency
  const summary = sql
    .split(';')
    .map(statement => {
      const tableMatch = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\)/);
      if (tableMatch) {
        const tableName = tableMatch[1];
        const columns = tableMatch[2]
          .split(',')
          .map(col => col.trim().split(/\s+/)[0]) // Just the column names
          .filter(name => name && !name.startsWith('FOREIGN') && !name.startsWith('PRIMARY'));
        
        return `Table: ${tableName} (${columns.join(', ')})`;
      }
      return null;
    })
    .filter(Boolean)
    .join('\n');

  console.log('--- Current Database Schema Summary ---');
  console.log(summary);
  console.log('---------------------------------------');

} catch (err) {
  console.log(`Error reading schema: ${err.message}`);
}
