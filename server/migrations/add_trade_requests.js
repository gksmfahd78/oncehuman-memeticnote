const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'once_human_memetics.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding trade requests system...');

db.serialize(() => {
  db.run('BEGIN TRANSACTION');

  // 거래 요청 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS trade_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_id INTEGER NOT NULL,
      requester_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE,
      FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(trade_id, requester_id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating trade_requests table:', err);
    } else {
      console.log('✓ Created trade_requests table');
    }
  });

  // 인덱스 추가
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_trade_requests_trade_id ON trade_requests(trade_id)
  `, (err) => {
    if (err) console.error('Error creating index:', err);
    else console.log('✓ Created index idx_trade_requests_trade_id');
  });

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_trade_requests_requester_id ON trade_requests(requester_id)
  `, (err) => {
    if (err) console.error('Error creating index:', err);
    else console.log('✓ Created index idx_trade_requests_requester_id');
  });

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_trade_requests_status ON trade_requests(status)
  `, (err) => {
    if (err) console.error('Error creating index:', err);
    else console.log('✓ Created index idx_trade_requests_status');
  });

  db.run('COMMIT', (err) => {
    if (err) {
      console.error('Error committing transaction:', err);
      db.run('ROLLBACK');
    } else {
      console.log('✓ Trade requests system migration completed successfully!');
    }
    db.close();
  });
});
