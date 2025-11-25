const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'once_human_memetics.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding clan invite system tables...');

db.serialize(() => {
  db.run('BEGIN TRANSACTION');

  // Add invite_code to clans table
  db.run(`
    ALTER TABLE clans ADD COLUMN invite_code TEXT UNIQUE
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding invite_code column:', err);
    } else {
      console.log('Added invite_code column to clans');
    }
  });

  // Create clan_join_requests table
  db.run(`
    CREATE TABLE IF NOT EXISTS clan_join_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clan_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      character_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      processed_by INTEGER,
      FOREIGN KEY (clan_id) REFERENCES clans(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE(clan_id, user_id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating clan_join_requests table:', err);
      db.run('ROLLBACK');
      return;
    }
    console.log('Created clan_join_requests table');
  });

  // Create index for join requests
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_clan_join_requests_clan_id ON clan_join_requests(clan_id)
  `, (err) => {
    if (err) {
      console.error('Error creating index:', err);
    } else {
      console.log('Created index on clan_join_requests');
    }
  });

  // Generate invite codes for existing clans
  db.all('SELECT id FROM clans WHERE invite_code IS NULL', (err, rows) => {
    if (err) {
      console.error('Error fetching clans:', err);
      db.run('ROLLBACK');
      return;
    }

    if (rows && rows.length > 0) {
      console.log(`Generating invite codes for ${rows.length} existing clans...`);

      rows.forEach(clan => {
        const inviteCode = generateInviteCode();
        db.run('UPDATE clans SET invite_code = ? WHERE id = ?', [inviteCode, clan.id], (err) => {
          if (err) {
            console.error(`Error updating clan ${clan.id}:`, err);
          }
        });
      });
    }
  });

  db.run('COMMIT', (err) => {
    if (err) {
      console.error('Error committing transaction:', err);
      db.run('ROLLBACK');
    } else {
      console.log('Migration completed successfully!');
      db.close();
    }
  });
});

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
