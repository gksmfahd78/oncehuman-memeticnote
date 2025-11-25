-- 사용자 신뢰도 점수 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_score DECIMAL(4,1) DEFAULT 36.5;
ALTER TABLE users ADD COLUMN IF NOT EXISTS completed_trades_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS received_reports_count INTEGER DEFAULT 0;

-- 거래 후기 테이블
CREATE TABLE IF NOT EXISTS trade_reviews (
  id SERIAL PRIMARY KEY,
  trade_id INTEGER NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewed_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating VARCHAR(20) NOT NULL CHECK (rating IN ('positive', 'neutral', 'negative')),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(trade_id, reviewer_id)
);

-- 사용자 신고 테이블
CREATE TABLE IF NOT EXISTS user_reports (
  id SERIAL PRIMARY KEY,
  trade_id INTEGER REFERENCES trades(id) ON DELETE CASCADE,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('fraud', 'no_show', 'rude', 'fake_item', 'price_change', 'other')),
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(trade_id, reporter_id, reported_user_id)
);

-- 거래 상태에 'confirmed' 추가 (구매자 확인)
-- 기존 trades 테이블의 status enum 확장은 복잡하므로 새로운 필드 추가
ALTER TABLE trades ADD COLUMN IF NOT EXISTS buyer_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS buyer_id INTEGER REFERENCES users(id);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_trade_reviews_trade_id ON trade_reviews(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_reviews_reviewed_user_id ON trade_reviews(reviewed_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported_user_id ON user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_trades_buyer_id ON trades(buyer_id);

-- 거래 후기 개수 뷰
CREATE OR REPLACE VIEW user_review_stats AS
SELECT 
  reviewed_user_id AS user_id,
  COUNT(*) AS total_reviews,
  COUNT(CASE WHEN rating = 'positive' THEN 1 END) AS positive_reviews,
  COUNT(CASE WHEN rating = 'neutral' THEN 1 END) AS neutral_reviews,
  COUNT(CASE WHEN rating = 'negative' THEN 1 END) AS negative_reviews
FROM trade_reviews
GROUP BY reviewed_user_id;
