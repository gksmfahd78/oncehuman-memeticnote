const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'once_human_memetics.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding profession column to characters table...');

db.serialize(() => {
  // Check if profession column exists
  db.all("PRAGMA table_info(characters)", (err, columns) => {
    if (err) {
      console.error('Error checking table:', err);
      db.close();
      return;
    }

    const hasProfession = columns.some(col => col.name === 'profession');

    if (hasProfession) {
      console.log('Profession column already exists!');
      db.close();
      return;
    }

    // Add profession column
    db.run(`
      ALTER TABLE characters
      ADD COLUMN profession TEXT CHECK (profession IN ('정원사', '조련사', '요리사'))
    `, (err) => {
      if (err) {
        console.error('Error adding profession column:', err);
      } else {
        console.log('✓ Successfully added profession column to characters table');
      }
      db.close();
    });
  });
});
