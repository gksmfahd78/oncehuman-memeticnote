-- Create chat spam blocks table for temporary bans
CREATE TABLE IF NOT EXISTS chat_spam_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  trade_id INTEGER NOT NULL,
  blocked_until DATETIME NOT NULL,
  reason TEXT DEFAULT 'spam',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_spam_blocks_user_trade ON chat_spam_blocks(user_id, trade_id, blocked_until);
