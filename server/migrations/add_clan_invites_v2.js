const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '..', 'database', 'once_human_memetics.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding clan invite system...');

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

db.serialize(() => {
  // Create new clans table with invite_code
  db.run(`
    CREATE TABLE clans_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clan_name TEXT NOT NULL,
      master_user_id INTEGER,
      invite_code TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (master_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Error creating new clans table:', err);
      return;
    }
    console.log('Created new clans table');
  });

  // Copy data and generate invite codes
  db.all('SELECT * FROM clans', (err, clans) => {
    if (err) {
      console.error('Error fetching clans:', err);
      return;
    }

    const stmt = db.prepare(`
      INSERT INTO clans_new (id, clan_name, master_user_id, invite_code, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    clans.forEach(clan => {
      const inviteCode = generateInviteCode();
      stmt.run(clan.id, clan.clan_name, clan.master_user_id, inviteCode, clan.created_at);
    });

    stmt.finalize((err) => {
      if (err) {
        console.error('Error inserting data:', err);
        return;
      }
      console.log(`Migrated ${clans.length} clans with invite codes`);

      // Drop old table and rename new table
      db.run('DROP TABLE clans', (err) => {
        if (err) {
          console.error('Error dropping old table:', err);
          return;
        }

        db.run('ALTER TABLE clans_new RENAME TO clans', (err) => {
          if (err) {
            console.error('Error renaming table:', err);
            return;
          }
          console.log('Renamed clans_new to clans');
          db.close();
        });
      });
    });
  });
});
