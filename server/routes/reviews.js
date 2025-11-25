const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const auth = require('../middleware/auth');

// 온도 점수 계산 함수
const calculateTrustScore = (positiveCount, neutralCount, negativeCount) => {
  const total = positiveCount + neutralCount + negativeCount;
  if (total === 0) return 36.5;

  // 긍정: +0.5°C, 중립: 0°C, 부정: -1°C
  const score = 36.5 + (positiveCount * 0.5) - (negativeCount * 1.0);

  // 0°C ~ 99°C 범위로 제한
  return Math.max(0, Math.min(99, score));
};

// 사용자 신뢰도 점수 업데이트 함수
const updateUserTrustScore = (userId) => {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT
        COUNT(*) as total_reviews,
        SUM(CASE WHEN rating = 'positive' THEN 1 ELSE 0 END) as positive_reviews,
        SUM(CASE WHEN rating = 'neutral' THEN 1 ELSE 0 END) as neutral_reviews,
        SUM(CASE WHEN rating = 'negative' THEN 1 ELSE 0 END) as negative_reviews
      FROM trade_reviews
      WHERE reviewed_user_id = ?
    `, [userId], (err, stats) => {
      if (err) return reject(err);

      const trustScore = calculateTrustScore(
        stats.positive_reviews || 0,
        stats.neutral_reviews || 0,
        stats.negative_reviews || 0
      );

      db.run(`
        UPDATE users
        SET trust_score = ?
        WHERE id = ?
      `, [trustScore, userId], (err) => {
        if (err) return reject(err);
        resolve(trustScore);
      });
    });
  });
};

// 거래 후기 작성 (거래 완료 후에만 가능)
router.post('/', auth, async (req, res) => {
  const { tradeId, reviewedUserId, rating, comment } = req.body;
  const reviewerId = req.user.id;

  // Validation
  if (!tradeId || !reviewedUserId || !rating) {
    return res.status(400).json({ error: '필수 항목을 입력해주세요' });
  }

  if (!['positive', 'neutral', 'negative'].includes(rating)) {
    return res.status(400).json({ error: '올바르지 않은 평가입니다' });
  }

  try {
    // 1. 거래 확인
    db.get(`
      SELECT * FROM trades WHERE id = ?
    `, [tradeId], async (err, trade) => {
      if (err) {
        console.error('Trade fetch error:', err);
        return res.status(500).json({ error: '거래 조회 중 오류가 발생했습니다' });
      }

      if (!trade) {
        return res.status(404).json({ error: '거래를 찾을 수 없습니다' });
      }

      // 2. 거래 완료 상태 확인
      if (trade.status !== 'completed') {
        return res.status(400).json({ error: '완료된 거래만 후기를 작성할 수 있습니다' });
      }

      // 3. 거래 참여자 확인 (판매자 또는 구매자만 후기 작성 가능)
      if (trade.user_id !== reviewerId && trade.buyer_id !== reviewerId) {
        return res.status(403).json({ error: '거래 참여자만 후기를 작성할 수 있습니다' });
      }

      // 4. 자기 자신에게 후기 작성 방지
      if (reviewerId === reviewedUserId) {
        return res.status(400).json({ error: '본인에게는 후기를 작성할 수 없습니다' });
      }

      // 5. 중복 후기 확인
      db.get(`
        SELECT * FROM trade_reviews
        WHERE trade_id = ? AND reviewer_id = ?
      `, [tradeId, reviewerId], (err, existingReview) => {
        if (err) {
          console.error('Review check error:', err);
          return res.status(500).json({ error: '후기 확인 중 오류가 발생했습니다' });
        }

        if (existingReview) {
          return res.status(400).json({ error: '이미 후기를 작성하셨습니다' });
        }

        // 6. 후기 저장
        db.run(`
          INSERT INTO trade_reviews (trade_id, reviewer_id, reviewed_user_id, rating, comment)
          VALUES (?, ?, ?, ?, ?)
        `, [tradeId, reviewerId, reviewedUserId, rating, comment], async function(err) {
          if (err) {
            console.error('Review insert error:', err);
            return res.status(500).json({ error: '후기 저장 중 오류가 발생했습니다' });
          }

          // 7. 신뢰도 점수 업데이트
          try {
            await updateUserTrustScore(reviewedUserId);

            // 8. 작성한 후기 반환
            db.get(`
              SELECT r.*, u.username as reviewer_username
              FROM trade_reviews r
              JOIN users u ON r.reviewer_id = u.id
              WHERE r.id = ?
            `, [this.lastID], (err, review) => {
              if (err) {
                console.error('Review fetch error:', err);
                return res.status(500).json({ error: '후기 조회 중 오류가 발생했습니다' });
              }

              res.status(201).json(review);
            });
          } catch (error) {
            console.error('Trust score update error:', error);
            res.status(500).json({ error: '신뢰도 점수 업데이트 중 오류가 발생했습니다' });
          }
        });
      });
    });
  } catch (error) {
    console.error('Review creation error:', error);
    res.status(500).json({ error: '후기 작성 중 오류가 발생했습니다' });
  }
});

// 특정 거래의 후기 조회
router.get('/trade/:tradeId', async (req, res) => {
  const { tradeId } = req.params;

  db.all(`
    SELECT r.*,
           reviewer.username as reviewer_username,
           reviewer.discord_avatar as reviewer_avatar,
           reviewed.username as reviewed_username
    FROM trade_reviews r
    JOIN users reviewer ON r.reviewer_id = reviewer.id
    JOIN users reviewed ON r.reviewed_user_id = reviewed.id
    WHERE r.trade_id = ?
    ORDER BY r.created_at DESC
  `, [tradeId], (err, reviews) => {
    if (err) {
      console.error('Reviews fetch error:', err);
      return res.status(500).json({ error: '후기 조회 중 오류가 발생했습니다' });
    }

    res.json(reviews);
  });
});

// 특정 사용자가 받은 후기 조회
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  db.all(`
    SELECT r.*,
           reviewer.username as reviewer_username,
           reviewer.discord_avatar as reviewer_avatar
    FROM trade_reviews r
    JOIN users reviewer ON r.reviewer_id = reviewer.id
    WHERE r.reviewed_user_id = ?
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `, [userId, limit, offset], (err, reviews) => {
    if (err) {
      console.error('User reviews fetch error:', err);
      return res.status(500).json({ error: '후기 조회 중 오류가 발생했습니다' });
    }

    // 총 개수 조회
    db.get(`
      SELECT COUNT(*) as total FROM trade_reviews WHERE reviewed_user_id = ?
    `, [userId], (err, countResult) => {
      if (err) {
        console.error('Review count error:', err);
        return res.status(500).json({ error: '후기 개수 조회 중 오류가 발생했습니다' });
      }

      res.json({
        reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit)
        }
      });
    });
  });
});

// 사용자 통계 조회 (신뢰도, 후기 통계)
router.get('/user/:userId/stats', async (req, res) => {
  const { userId } = req.params;

  db.get(`
    SELECT
      u.trust_score,
      u.completed_trades_count,
      u.received_reports_count,
      COUNT(r.id) as total_reviews,
      SUM(CASE WHEN r.rating = 'positive' THEN 1 ELSE 0 END) as positive_reviews,
      SUM(CASE WHEN r.rating = 'neutral' THEN 1 ELSE 0 END) as neutral_reviews,
      SUM(CASE WHEN r.rating = 'negative' THEN 1 ELSE 0 END) as negative_reviews
    FROM users u
    LEFT JOIN trade_reviews r ON u.id = r.reviewed_user_id
    WHERE u.id = ?
    GROUP BY u.id
  `, [userId], (err, stats) => {
    if (err) {
      console.error('User stats fetch error:', err);
      return res.status(500).json({ error: '통계 조회 중 오류가 발생했습니다' });
    }

    if (!stats) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    res.json(stats);
  });
});

// 특정 거래에 대한 현재 사용자의 후기 작성 여부 확인
router.get('/check/:tradeId', auth, async (req, res) => {
  const { tradeId } = req.params;
  const userId = req.user.id;

  try {
    const review = await db.get(
      'SELECT id FROM trade_reviews WHERE trade_id = ? AND reviewer_id = ?',
      [tradeId, userId]
    );

    res.json({ hasReviewed: !!review });
  } catch (err) {
    console.error('Review check error:', err);
    res.status(500).json({ error: '후기 확인 중 오류가 발생했습니다' });
  }
});

module.exports = router;
