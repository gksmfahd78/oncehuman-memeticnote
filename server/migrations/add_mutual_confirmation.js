const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'once_human_memetics.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding mutual confirmation system...');

db.serialize(() => {
  db.run('BEGIN TRANSACTION');

  // seller_confirmed 컬럼 추가
  db.run(`
    ALTER TABLE trades ADD COLUMN seller_confirmed INTEGER DEFAULT 0
  `, (err) => {
    if (err) {
      console.error('Error adding seller_confirmed column:', err);
    } else {
      console.log('✓ Added seller_confirmed column to trades');
    }
  });

  db.run('COMMIT', (err) => {
    if (err) {
      console.error('Error committing transaction:', err);
      db.run('ROLLBACK');
    } else {
      console.log('✓ Mutual confirmation system migration completed successfully!');
    }
    db.close();
  });
});
