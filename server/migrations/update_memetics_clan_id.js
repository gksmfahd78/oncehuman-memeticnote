const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'once_human_memetics.db');
const db = new sqlite3.Database(dbPath);

console.log('Updating memetics clan_id from characters...');

db.serialize(() => {
  db.run('BEGIN TRANSACTION');

  // Update memetics clan_id based on character's clan_id
  db.run(`
    UPDATE memetics
    SET clan_id = (
      SELECT c.clan_id
      FROM characters c
      WHERE c.id = memetics.character_id
    )
    WHERE character_id IN (SELECT id FROM characters WHERE clan_id IS NOT NULL)
  `, (err) => {
    if (err) {
      console.error('Error updating memetics:', err);
      db.run('ROLLBACK');
      return;
    }
    console.log('Updated memetics with clan_id from characters');
  });

  db.run('COMMIT', (err) => {
    if (err) {
      console.error('Error committing transaction:', err);
      db.run('ROLLBACK');
    } else {
      console.log('Migration completed successfully!');

      // Show results
      db.all('SELECT COUNT(*) as count FROM memetics WHERE clan_id IS NOT NULL', (err, rows) => {
        if (!err && rows.length > 0) {
          console.log(`Total memetics with clan_id: ${rows[0].count}`);
        }
        db.close();
      });
    }
  });
});
