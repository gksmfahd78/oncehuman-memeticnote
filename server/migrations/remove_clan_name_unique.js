const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'once_human_memetics.db');
const db = new sqlite3.Database(dbPath);

console.log('Starting migration: Remove UNIQUE constraint from clan_name...');

db.serialize(() => {
  // Start transaction
  db.run('BEGIN TRANSACTION');

  // Create new table without UNIQUE constraint
  db.run(`
    CREATE TABLE clans_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clan_name TEXT NOT NULL,
      master_user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (master_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Error creating new table:', err);
      db.run('ROLLBACK');
      return;
    }
    console.log('Created new clans table');
  });

  // Copy data from old table to new table
  db.run(`
    INSERT INTO clans_new (id, clan_name, master_user_id, created_at)
    SELECT id, clan_name, master_user_id, created_at
    FROM clans
  `, (err) => {
    if (err) {
      console.error('Error copying data:', err);
      db.run('ROLLBACK');
      return;
    }
    console.log('Copied data to new table');
  });

  // Drop old table
  db.run('DROP TABLE clans', (err) => {
    if (err) {
      console.error('Error dropping old table:', err);
      db.run('ROLLBACK');
      return;
    }
    console.log('Dropped old clans table');
  });

  // Rename new table to original name
  db.run('ALTER TABLE clans_new RENAME TO clans', (err) => {
    if (err) {
      console.error('Error renaming table:', err);
      db.run('ROLLBACK');
      return;
    }
    console.log('Renamed new table to clans');
  });

  // Recreate indexes and foreign keys for clan_members
  db.run(`
    CREATE TABLE IF NOT EXISTS clan_members_temp AS
    SELECT * FROM clan_members
  `, (err) => {
    if (err) {
      console.error('Error backing up clan_members:', err);
      db.run('ROLLBACK');
      return;
    }
  });

  db.run('DROP TABLE IF EXISTS clan_members', (err) => {
    if (err) {
      console.error('Error dropping clan_members:', err);
      db.run('ROLLBACK');
      return;
    }
  });

  db.run(`
    CREATE TABLE clan_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clan_id INTEGER NOT NULL,
      character_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT DEFAULT 'member' CHECK (role IN ('master', 'member')),
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clan_id) REFERENCES clans(id) ON DELETE CASCADE,
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(clan_id, character_id)
    )
  `, (err) => {
    if (err) {
      console.error('Error recreating clan_members:', err);
      db.run('ROLLBACK');
      return;
    }
  });

  db.run(`
    INSERT INTO clan_members (id, clan_id, character_id, user_id, role, joined_at)
    SELECT id, clan_id, character_id, user_id, role, joined_at
    FROM clan_members_temp
  `, (err) => {
    if (err) {
      console.error('Error restoring clan_members data:', err);
      db.run('ROLLBACK');
      return;
    }
  });

  db.run('DROP TABLE clan_members_temp', (err) => {
    if (err) {
      console.error('Error dropping temp table:', err);
      db.run('ROLLBACK');
      return;
    }
  });

  // Recreate index
  db.run('CREATE INDEX IF NOT EXISTS idx_clan_members_clan_id ON clan_members(clan_id)', (err) => {
    if (err) {
      console.error('Error creating index:', err);
      db.run('ROLLBACK');
      return;
    }
  });

  // Commit transaction
  db.run('COMMIT', (err) => {
    if (err) {
      console.error('Error committing transaction:', err);
      db.run('ROLLBACK');
    } else {
      console.log('Migration completed successfully!');
    }
    db.close();
  });
});
