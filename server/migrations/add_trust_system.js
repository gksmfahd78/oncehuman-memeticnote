const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'once_human_memetics.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding trust system (reviews, reports, temperature)...');

db.serialize(() => {
  db.run('BEGIN TRANSACTION');

  // 사용자 신뢰도 점수 추가
  db.run(`
    ALTER TABLE users ADD COLUMN trust_score REAL DEFAULT 36.5
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding trust_score column:', err);
    } else {
      console.log('✓ Added trust_score column to users');
    }
  });

  db.run(`
    ALTER TABLE users ADD COLUMN completed_trades_count INTEGER DEFAULT 0
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding completed_trades_count column:', err);
    } else {
      console.log('✓ Added completed_trades_count column to users');
    }
  });

  db.run(`
    ALTER TABLE users ADD COLUMN received_reports_count INTEGER DEFAULT 0
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding received_reports_count column:', err);
    } else {
      console.log('✓ Added received_reports_count column to users');
    }
  });

  // 거래 후기 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS trade_reviews (
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
  `, (err) => {
    if (err) {
      console.error('Error creating trade_reviews table:', err);
    } else {
      console.log('✓ Created trade_reviews table');
    }
  });

  // 사용자 신고 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS user_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_id INTEGER,
      reporter_id INTEGER NOT NULL,
      reported_user_id INTEGER NOT NULL,
      reason TEXT NOT NULL CHECK (reason IN ('fraud', 'no_show', 'rude', 'fake_item', 'price_change', 'other')),
      description TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE,
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id),
      UNIQUE(trade_id, reporter_id, reported_user_id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating user_reports table:', err);
    } else {
      console.log('✓ Created user_reports table');
    }
  });

  // 거래 테이블에 구매자 정보 추가
  db.run(`
    ALTER TABLE trades ADD COLUMN buyer_confirmed INTEGER DEFAULT 0
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding buyer_confirmed column:', err);
    } else {
      console.log('✓ Added buyer_confirmed column to trades');
    }
  });

  db.run(`
    ALTER TABLE trades ADD COLUMN buyer_id INTEGER
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding buyer_id column:', err);
    } else {
      console.log('✓ Added buyer_id column to trades');
    }
  });

  // 인덱스 추가
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_trade_reviews_trade_id ON trade_reviews(trade_id)
  `, (err) => {
    if (err) console.error('Error creating index:', err);
    else console.log('✓ Created index idx_trade_reviews_trade_id');
  });

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_trade_reviews_reviewed_user_id ON trade_reviews(reviewed_user_id)
  `, (err) => {
    if (err) console.error('Error creating index:', err);
    else console.log('✓ Created index idx_trade_reviews_reviewed_user_id');
  });

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_user_reports_reported_user_id ON user_reports(reported_user_id)
  `, (err) => {
    if (err) console.error('Error creating index:', err);
    else console.log('✓ Created index idx_user_reports_reported_user_id');
  });

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status)
  `, (err) => {
    if (err) console.error('Error creating index:', err);
    else console.log('✓ Created index idx_user_reports_status');
  });

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_trades_buyer_id ON trades(buyer_id)
  `, (err) => {
    if (err) console.error('Error creating index:', err);
    else console.log('✓ Created index idx_trades_buyer_id');
  });

  db.run('COMMIT', (err) => {
    if (err) {
      console.error('Error committing transaction:', err);
      db.run('ROLLBACK');
    } else {
      console.log('✓ Trust system migration completed successfully!');
    }
    db.close();
  });
});
