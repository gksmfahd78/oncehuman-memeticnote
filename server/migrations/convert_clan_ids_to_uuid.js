const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '..', 'database', 'once_human_memetics.db');
const db = new sqlite3.Database(dbPath);

console.log('Converting clan IDs to UUID...');

db.serialize(() => {
  db.run('BEGIN TRANSACTION');

  // Create new tables with UUID
  db.run(`
    CREATE TABLE clans_new (
      id TEXT PRIMARY KEY,
      clan_name TEXT NOT NULL,
      master_user_id INTEGER,
      invite_code TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (master_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Error creating clans_new table:', err);
      db.run('ROLLBACK');
      return;
    }
    console.log('Created clans_new table');
  });

  db.run(`
    CREATE TABLE clan_members_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clan_id TEXT NOT NULL,
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
      console.error('Error creating clan_members_new table:', err);
      db.run('ROLLBACK');
      return;
    }
    console.log('Created clan_members_new table');
  });

  db.run(`
    CREATE TABLE clan_join_requests_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clan_id TEXT NOT NULL,
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
      console.error('Error creating clan_join_requests_new table:', err);
      db.run('ROLLBACK');
      return;
    }
    console.log('Created clan_join_requests_new table');
  });

  db.run(`
    CREATE TABLE characters_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      character_name TEXT NOT NULL,
      note TEXT,
      clan_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (clan_id) REFERENCES clans(id) ON DELETE SET NULL,
      UNIQUE(user_id, character_name)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating characters_new table:', err);
      db.run('ROLLBACK');
      return;
    }
    console.log('Created characters_new table');
  });

  db.run(`
    CREATE TABLE memetics_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      clan_id TEXT,
      level INTEGER NOT NULL CHECK (level IN (5, 10, 15, 20, 25, 30, 35, 40, 45, 50)),
      memetic_name TEXT NOT NULL,
      memetic_type TEXT,
      notes TEXT,
      additional_notes TEXT,
      obtained_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY (clan_id) REFERENCES clans(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating memetics_new table:', err);
      db.run('ROLLBACK');
      return;
    }
    console.log('Created memetics_new table');
  });

  // Get all existing clans and create UUID mapping
  db.all('SELECT * FROM clans', (err, clans) => {
    if (err) {
      console.error('Error fetching clans:', err);
      db.run('ROLLBACK');
      return;
    }

    const idMapping = {};
    const clanStmt = db.prepare(`
      INSERT INTO clans_new (id, clan_name, master_user_id, invite_code, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    clans.forEach(clan => {
      const newUuid = uuidv4();
      idMapping[clan.id] = newUuid;
      clanStmt.run(newUuid, clan.clan_name, clan.master_user_id, clan.invite_code, clan.created_at);
    });

    clanStmt.finalize((err) => {
      if (err) {
        console.error('Error inserting clans:', err);
        db.run('ROLLBACK');
        return;
      }
      console.log(`Migrated ${clans.length} clans with UUIDs`);

      // Migrate clan_members
      db.all('SELECT * FROM clan_members', (err, members) => {
        if (err) {
          console.error('Error fetching clan_members:', err);
          db.run('ROLLBACK');
          return;
        }

        const memberStmt = db.prepare(`
          INSERT INTO clan_members_new (id, clan_id, character_id, user_id, role, joined_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        members.forEach(member => {
          const newClanId = idMapping[member.clan_id];
          memberStmt.run(member.id, newClanId, member.character_id, member.user_id, member.role, member.joined_at);
        });

        memberStmt.finalize((err) => {
          if (err) {
            console.error('Error inserting clan_members:', err);
            db.run('ROLLBACK');
            return;
          }
          console.log(`Migrated ${members.length} clan members`);

          // Migrate clan_join_requests
          db.all('SELECT * FROM clan_join_requests', (err, requests) => {
            if (err && !err.message.includes('no such table')) {
              console.error('Error fetching clan_join_requests:', err);
              db.run('ROLLBACK');
              return;
            }

            if (requests && requests.length > 0) {
              const requestStmt = db.prepare(`
                INSERT INTO clan_join_requests_new (id, clan_id, user_id, character_id, status, created_at, processed_at, processed_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `);

              requests.forEach(request => {
                const newClanId = idMapping[request.clan_id];
                requestStmt.run(request.id, newClanId, request.user_id, request.character_id, request.status, request.created_at, request.processed_at, request.processed_by);
              });

              requestStmt.finalize((err) => {
                if (err) {
                  console.error('Error inserting clan_join_requests:', err);
                  db.run('ROLLBACK');
                  return;
                }
                console.log(`Migrated ${requests.length} clan join requests`);
                migrateCharacters();
              });
            } else {
              console.log('No clan join requests to migrate');
              migrateCharacters();
            }
          });
        });
      });
    });

    function migrateCharacters() {
      // Migrate characters
      db.all('SELECT * FROM characters', (err, characters) => {
        if (err) {
          console.error('Error fetching characters:', err);
          db.run('ROLLBACK');
          return;
        }

        const charStmt = db.prepare(`
          INSERT INTO characters_new (id, user_id, character_name, note, clan_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        characters.forEach(char => {
          const newClanId = char.clan_id ? idMapping[char.clan_id] : null;
          charStmt.run(char.id, char.user_id, char.character_name, char.note, newClanId, char.created_at);
        });

        charStmt.finalize((err) => {
          if (err) {
            console.error('Error inserting characters:', err);
            db.run('ROLLBACK');
            return;
          }
          console.log(`Migrated ${characters.length} characters`);

          // Migrate memetics
          db.all('SELECT * FROM memetics', (err, memetics) => {
            if (err) {
              console.error('Error fetching memetics:', err);
              db.run('ROLLBACK');
              return;
            }

            const memeticStmt = db.prepare(`
              INSERT INTO memetics_new (id, character_id, clan_id, level, memetic_name, memetic_type, notes, additional_notes, obtained_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            memetics.forEach(memetic => {
              const newClanId = memetic.clan_id ? idMapping[memetic.clan_id] : null;
              memeticStmt.run(memetic.id, memetic.character_id, newClanId, memetic.level, memetic.memetic_name, memetic.memetic_type, memetic.notes, memetic.additional_notes, memetic.obtained_at);
            });

            memeticStmt.finalize((err) => {
              if (err) {
                console.error('Error inserting memetics:', err);
                db.run('ROLLBACK');
                return;
              }
              console.log(`Migrated ${memetics.length} memetics`);

              // Drop old tables and rename new ones
              dropAndRename();
            });
          });
        });
      });
    }

    function dropAndRename() {
      db.run('DROP TABLE IF EXISTS clan_join_requests', (err) => {
        if (err) console.log('clan_join_requests table does not exist');
      });
      db.run('DROP TABLE memetics', (err) => {
        if (err) {
          console.error('Error dropping memetics:', err);
          db.run('ROLLBACK');
          return;
        }
      });
      db.run('DROP TABLE clan_members', (err) => {
        if (err) {
          console.error('Error dropping clan_members:', err);
          db.run('ROLLBACK');
          return;
        }
      });
      db.run('DROP TABLE characters', (err) => {
        if (err) {
          console.error('Error dropping characters:', err);
          db.run('ROLLBACK');
          return;
        }
      });
      db.run('DROP TABLE clans', (err) => {
        if (err) {
          console.error('Error dropping clans:', err);
          db.run('ROLLBACK');
          return;
        }

        db.run('ALTER TABLE clans_new RENAME TO clans', (err) => {
          if (err) {
            console.error('Error renaming clans_new:', err);
            db.run('ROLLBACK');
            return;
          }
          db.run('ALTER TABLE clan_members_new RENAME TO clan_members');
          db.run('ALTER TABLE clan_join_requests_new RENAME TO clan_join_requests');
          db.run('ALTER TABLE characters_new RENAME TO characters');
          db.run('ALTER TABLE memetics_new RENAME TO memetics');

          // Recreate indexes
          db.run('CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id)');
          db.run('CREATE INDEX IF NOT EXISTS idx_clan_members_clan_id ON clan_members(clan_id)');
          db.run('CREATE INDEX IF NOT EXISTS idx_clan_members_character_id ON clan_members(character_id)');
          db.run('CREATE INDEX IF NOT EXISTS idx_memetics_character_id ON memetics(character_id)');
          db.run('CREATE INDEX IF NOT EXISTS idx_memetics_level ON memetics(level)');
          db.run('CREATE INDEX IF NOT EXISTS idx_clan_join_requests_clan_id ON clan_join_requests(clan_id)');

          db.run('COMMIT', (err) => {
            if (err) {
              console.error('Error committing transaction:', err);
              db.run('ROLLBACK');
            } else {
              console.log('Migration completed successfully!');
              console.log('Clan ID mapping:', idMapping);
              db.close();
            }
          });
        });
      });
    }
  });
});
