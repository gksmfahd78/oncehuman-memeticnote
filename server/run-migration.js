const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// SQLite database file path
const dbPath = path.join(__dirname, 'database', 'once_human_memetics.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Read and execute migration file
const migrationPath = path.join(__dirname, 'migrations', '001_create_chat_system.sql');

fs.readFile(migrationPath, 'utf8', (err, sql) => {
  if (err) {
    console.error('Error reading migration file:', err);
    process.exit(1);
  }

  console.log('Running migration: 001_create_chat_system.sql');

  // Split by semicolon and execute each statement
  const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

  let completed = 0;
  const total = statements.length;

  statements.forEach((statement, index) => {
    db.run(statement.trim(), (err) => {
      if (err) {
        // Ignore "duplicate column" errors for ALTER TABLE ADD COLUMN
        if (err.message.includes('duplicate column name')) {
          console.log(`⚠️  Statement ${index + 1}: Column already exists (skipped)`);
        } else {
          console.error(`❌ Error in statement ${index + 1}:`, err.message);
          console.error('Statement:', statement.trim().substring(0, 100) + '...');
        }
      } else {
        console.log(`✓ Statement ${index + 1}/${total} executed successfully`);
      }

      completed++;
      if (completed === total) {
        console.log('\n✅ Migration completed!');
        db.close();
      }
    });
  });
});
