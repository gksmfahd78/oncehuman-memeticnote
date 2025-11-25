const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// SQLite database file path
const dbPath = path.join(__dirname, '..', 'database', 'once_human_memetics.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    // Initialize tables
    initializeTables();
  }
});

// Clean up orphaned records
function cleanupOrphanedRecords() {
  db.serialize(() => {
    // Clean up clan_members with non-existent characters
    db.run(`
      DELETE FROM clan_members
      WHERE character_id NOT IN (SELECT id FROM characters)
    `, (err) => {
      if (err) {
        console.error('Error cleaning up orphaned clan_members:', err);
      } else {
        console.log('Cleaned up orphaned clan_members records');
      }
    });

    // Clean up memetics with non-existent characters
    db.run(`
      DELETE FROM memetics
      WHERE character_id NOT IN (SELECT id FROM characters)
    `, (err) => {
      if (err) {
        console.error('Error cleaning up orphaned memetics:', err);
      } else {
        console.log('Cleaned up orphaned memetics records');
      }
    });
  });
}

// Initialize database tables
function initializeTables() {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uid TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Characters table
    db.run(`
      CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        character_name TEXT NOT NULL,
        profession TEXT CHECK (profession IN ('정원사', '조련사', '요리사')),
        note TEXT,
        clan_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (clan_id) REFERENCES clans(id) ON DELETE SET NULL,
        UNIQUE(user_id, character_name)
      )
    `);

    // Clans table
    db.run(`
      CREATE TABLE IF NOT EXISTS clans (
        id TEXT PRIMARY KEY,
        clan_name TEXT NOT NULL,
        master_user_id INTEGER,
        invite_code TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (master_user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Clan join requests table
    db.run(`
      CREATE TABLE IF NOT EXISTS clan_join_requests (
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
    `);

    // Clan members table
    db.run(`
      CREATE TABLE IF NOT EXISTS clan_members (
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
    `);

    // Memetics table
    db.run(`
      CREATE TABLE IF NOT EXISTS memetics (
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
    `);

    // Trades table
    db.run(`
      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        item_name TEXT NOT NULL,
        price TEXT,
        listing_type TEXT DEFAULT 'sell' CHECK (listing_type IN ('sell', 'buy')),
        trade_type TEXT NOT NULL CHECK (trade_type IN ('server', 'eternalland')),
        server_name TEXT,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
        buyer_id INTEGER,
        seller_confirmed INTEGER DEFAULT 0,
        buyer_confirmed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Trade requests table
    db.run(`
      CREATE TABLE IF NOT EXISTS trade_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trade_id INTEGER NOT NULL,
        requester_id INTEGER NOT NULL,
        message TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE,
        FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(trade_id, requester_id)
      )
    `);

    // Reviews table
    db.run(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trade_id INTEGER NOT NULL,
        reviewer_id INTEGER NOT NULL,
        reviewed_user_id INTEGER NOT NULL,
        rating TEXT NOT NULL CHECK (rating IN ('positive', 'neutral', 'negative')),
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(trade_id, reviewer_id)
      )
    `);

    // Chat messages table
    db.run(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trade_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        is_filtered INTEGER DEFAULT 0,
        filtered_message TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Chat reports table
    db.run(`
      CREATE TABLE IF NOT EXISTS chat_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id INTEGER NOT NULL,
        reporter_id INTEGER NOT NULL,
        reported_user_id INTEGER NOT NULL,
        report_type TEXT NOT NULL CHECK (report_type IN ('spam', 'contact_sharing', 'harassment', 'rmt', 'other')),
        description TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
        reviewed_at DATETIME,
        reviewed_by INTEGER,
        admin_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // User blocks table
    db.run(`
      CREATE TABLE IF NOT EXISTS user_blocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        blocker_id INTEGER NOT NULL,
        blocked_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(blocker_id, blocked_id)
      )
    `);

    // User warnings table
    db.run(`
      CREATE TABLE IF NOT EXISTS user_warnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        admin_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Squad recruitments table
    db.run(`
      CREATE TABLE IF NOT EXISTS squad_recruitments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        server_name TEXT NOT NULL,
        squad_type TEXT NOT NULL CHECK (squad_type IN ('pvp', 'pve', 'mixed')),
        required_members INTEGER NOT NULL,
        requirements TEXT,
        status TEXT DEFAULT 'recruiting' CHECK (status IN ('recruiting', 'closed')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better query performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_clan_members_clan_id ON clan_members(clan_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_clan_members_character_id ON clan_members(character_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_clan_members_user_id ON clan_members(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_memetics_character_id ON memetics(character_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_memetics_level ON memetics(level)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_clan_join_requests_clan_id ON clan_join_requests(clan_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_clan_join_requests_status ON clan_join_requests(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_trades_listing_type ON trades(listing_type)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_trades_trade_type ON trades(trade_type)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at DESC)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_trades_buyer_id ON trades(buyer_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_trade_requests_status ON trade_requests(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_trade_requests_requester_id ON trade_requests(requester_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_chat_messages_trade_id ON chat_messages(trade_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_id ON chat_messages(receiver_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_chat_messages_is_read ON chat_messages(is_read)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_unread ON chat_messages(receiver_id, is_read)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_chat_reports_status ON chat_reports(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_chat_reports_reported_user ON chat_reports(reported_user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_reviews_trade_id ON reviews(trade_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_user_id ON reviews(reviewed_user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON user_blocks(blocker_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON user_blocks(blocked_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_user_warnings_user_id ON user_warnings(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_squad_recruitments_user_id ON squad_recruitments(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_squad_recruitments_status ON squad_recruitments(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_squad_recruitments_squad_type ON squad_recruitments(squad_type)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_squad_recruitments_created_at ON squad_recruitments(created_at DESC)`);

    // Add uid column to existing users table if it doesn't exist
    db.all("PRAGMA table_info(users)", [], (err, columns) => {
      if (err) {
        console.error('Error checking users table:', err);
        return;
      }

      const hasUid = columns.some(col => col.name === 'uid');
      const hasBio = columns.some(col => col.name === 'bio');
      const hasProfileImage = columns.some(col => col.name === 'profile_image');
      const hasDiscordId = columns.some(col => col.name === 'discord_id');
      const hasDiscordUsername = columns.some(col => col.name === 'discord_username');
      const hasDiscordAvatar = columns.some(col => col.name === 'discord_avatar');
      const hasDiscordCreatedAt = columns.some(col => col.name === 'discord_created_at');
      const hasIsBanned = columns.some(col => col.name === 'is_banned');
      const hasBanUntil = columns.some(col => col.name === 'ban_until');
      const hasBanReason = columns.some(col => col.name === 'ban_reason');
      const hasBannedAt = columns.some(col => col.name === 'banned_at');
      const hasBannedBy = columns.some(col => col.name === 'banned_by');
      const hasTrustScore = columns.some(col => col.name === 'trust_score');
      const hasCompletedTradesCount = columns.some(col => col.name === 'completed_trades_count');
      const hasLastLoginAt = columns.some(col => col.name === 'last_login_at');

      if (!hasUid) {
        console.log('Adding uid column to users table...');
        db.run(`ALTER TABLE users ADD COLUMN uid TEXT`, (err) => {
          if (err) {
            console.error('Error adding uid column:', err);
          } else {
            console.log('uid column added successfully');
            // Generate UIDs for existing users based on their username
            db.all('SELECT id, username FROM users WHERE uid IS NULL', [], (err, users) => {
              if (err) {
                console.error('Error fetching users:', err);
                return;
              }
              users.forEach(user => {
                const generatedUid = `user_${user.id}_${Date.now()}`;
                db.run('UPDATE users SET uid = ? WHERE id = ?', [generatedUid, user.id], (err) => {
                  if (err) {
                    console.error(`Error updating uid for user ${user.id}:`, err);
                  }
                });
              });
            });
          }
        });
      }

      if (!hasBio) {
        console.log('Adding bio column to users table...');
        db.run(`ALTER TABLE users ADD COLUMN bio TEXT`, (err) => {
          if (err) {
            console.error('Error adding bio column:', err);
          } else {
            console.log('bio column added successfully');
          }
        });
      }

      if (!hasProfileImage) {
        console.log('Adding profile_image column to users table...');
        db.run(`ALTER TABLE users ADD COLUMN profile_image TEXT`, (err) => {
          if (err) {
            console.error('Error adding profile_image column:', err);
          } else {
            console.log('profile_image column added successfully');
          }
        });
      }

      if (!hasDiscordId) {
        console.log('Adding discord_id column to users table...');
        db.run(`ALTER TABLE users ADD COLUMN discord_id TEXT UNIQUE`, (err) => {
          if (err) {
            console.error('Error adding discord_id column:', err);
          } else {
            console.log('discord_id column added successfully');
          }
        });
      }

      if (!hasDiscordUsername) {
        console.log('Adding discord_username column to users table...');
        db.run(`ALTER TABLE users ADD COLUMN discord_username TEXT`, (err) => {
          if (err) {
            console.error('Error adding discord_username column:', err);
          } else {
            console.log('discord_username column added successfully');
          }
        });
      }

      if (!hasDiscordAvatar) {
        console.log('Adding discord_avatar column to users table...');
        db.run(`ALTER TABLE users ADD COLUMN discord_avatar TEXT`, (err) => {
          if (err) {
            console.error('Error adding discord_avatar column:', err);
          } else {
            console.log('discord_avatar column added successfully');
          }
        });
      }

      if (!hasDiscordCreatedAt) {
        console.log('Adding discord_created_at column to users table...');
        db.run(`ALTER TABLE users ADD COLUMN discord_created_at TEXT`, (err) => {
          if (err) {
            console.error('Error adding discord_created_at column:', err);
          } else {
            console.log('discord_created_at column added successfully');
          }
        });
      }

      if (!hasIsBanned) {
        console.log('Adding is_banned column to users table...');
        db.run(`ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0`, (err) => {
          if (err) {
            console.error('Error adding is_banned column:', err);
          } else {
            console.log('is_banned column added successfully');
          }
        });
      }

      if (!hasBanUntil) {
        console.log('Adding ban_until column to users table...');
        db.run(`ALTER TABLE users ADD COLUMN ban_until DATETIME`, (err) => {
          if (err) {
            console.error('Error adding ban_until column:', err);
          } else {
            console.log('ban_until column added successfully');
          }
        });
      }

      if (!hasBanReason) {
        console.log('Adding ban_reason column to users table...');
        db.run(`ALTER TABLE users ADD COLUMN ban_reason TEXT`, (err) => {
          if (err) {
            console.error('Error adding ban_reason column:', err);
          } else {
            console.log('ban_reason column added successfully');
          }
        });
      }

      if (!hasBannedAt) {
        console.log('Adding banned_at column to users table...');
        db.run(`ALTER TABLE users ADD COLUMN banned_at DATETIME`, (err) => {
          if (err) {
            console.error('Error adding banned_at column:', err);
          } else {
            console.log('banned_at column added successfully');
          }
        });
      }

      if (!hasBannedBy) {
        console.log('Adding banned_by column to users table...');
        db.run(`ALTER TABLE users ADD COLUMN banned_by INTEGER`, (err) => {
          if (err) {
            console.error('Error adding banned_by column:', err);
          } else {
            console.log('banned_by column added successfully');
          }
        });
      }

      if (!hasTrustScore) {
        console.log('Adding trust_score column to users table...');
        db.run(`ALTER TABLE users ADD COLUMN trust_score REAL DEFAULT 36.5`, (err) => {
          if (err) {
            console.error('Error adding trust_score column:', err);
          } else {
            console.log('trust_score column added successfully');
          }
        });
      }

      if (!hasCompletedTradesCount) {
        console.log('Adding completed_trades_count column to users table...');
        db.run(`ALTER TABLE users ADD COLUMN completed_trades_count INTEGER DEFAULT 0`, (err) => {
          if (err) {
            console.error('Error adding completed_trades_count column:', err);
          } else {
            console.log('completed_trades_count column added successfully');
          }
        });
      }

      if (!hasLastLoginAt) {
        console.log('Adding last_login_at column to users table...');
        db.run(`ALTER TABLE users ADD COLUMN last_login_at DATETIME`, (err) => {
          if (err) {
            console.error('Error adding last_login_at column:', err);
          } else {
            console.log('last_login_at column added successfully');
          }
        });
      }
    });

    // Add columns to trades table if they don't exist
    db.all("PRAGMA table_info(trades)", [], (err, columns) => {
      if (err) {
        console.error('Error checking trades table:', err);
        return;
      }

      const hasBuyerId = columns.some(col => col.name === 'buyer_id');
      const hasSellerConfirmed = columns.some(col => col.name === 'seller_confirmed');
      const hasBuyerConfirmed = columns.some(col => col.name === 'buyer_confirmed');
      const hasListingType = columns.some(col => col.name === 'listing_type');

      if (!hasBuyerId) {
        console.log('Adding buyer_id column to trades table...');
        db.run(`ALTER TABLE trades ADD COLUMN buyer_id INTEGER`, (err) => {
          if (err) {
            console.error('Error adding buyer_id column:', err);
          } else {
            console.log('buyer_id column added successfully');
          }
        });
      }

      if (!hasSellerConfirmed) {
        console.log('Adding seller_confirmed column to trades table...');
        db.run(`ALTER TABLE trades ADD COLUMN seller_confirmed INTEGER DEFAULT 0`, (err) => {
          if (err) {
            console.error('Error adding seller_confirmed column:', err);
          } else {
            console.log('seller_confirmed column added successfully');
          }
        });
      }

      if (!hasBuyerConfirmed) {
        console.log('Adding buyer_confirmed column to trades table...');
        db.run(`ALTER TABLE trades ADD COLUMN buyer_confirmed INTEGER DEFAULT 0`, (err) => {
          if (err) {
            console.error('Error adding buyer_confirmed column:', err);
          } else {
            console.log('buyer_confirmed column added successfully');
          }
        });
      }

      if (!hasListingType) {
        console.log('Adding listing_type column to trades table...');
        db.run(`ALTER TABLE trades ADD COLUMN listing_type TEXT DEFAULT 'sell' CHECK (listing_type IN ('sell', 'buy'))`, (err) => {
          if (err) {
            console.error('Error adding listing_type column:', err);
          } else {
            console.log('listing_type column added successfully');
            // Set all existing trades to 'sell' type
            db.run(`UPDATE trades SET listing_type = 'sell' WHERE listing_type IS NULL`, (err) => {
              if (err) {
                console.error('Error updating existing trades with listing_type:', err);
              } else {
                console.log('Existing trades updated with listing_type = sell');
              }
            });
          }
        });
      }
    });

    // Clean up orphaned records after tables are initialized
    // Chat spam blocks table for temporary bans
    db.run(`
      CREATE TABLE IF NOT EXISTS chat_spam_blocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        trade_id INTEGER NOT NULL,
        blocked_until DATETIME NOT NULL,
        reason TEXT DEFAULT 'spam',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_chat_spam_blocks_user_trade ON chat_spam_blocks(user_id, trade_id, blocked_until)`);

    // Bug reports table
    db.run(`
      CREATE TABLE IF NOT EXISTS bug_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'question')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        email TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
        admin_response TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_bug_reports_type ON bug_reports(type)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_bug_reports_created ON bug_reports(created_at DESC)`);

    // User notifications table (for bug report responses, etc.)
    db.run(`
      CREATE TABLE IF NOT EXISTS user_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('bug_report_response', 'system', 'announcement')),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON user_notifications(user_id, is_read)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_created ON user_notifications(created_at DESC)`);

    cleanupOrphanedRecords();
  });
}

// Promisify database operations for async/await
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

module.exports = {
  query,
  run,
  get,
  db
};
