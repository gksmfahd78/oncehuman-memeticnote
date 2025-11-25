const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const auth = require('../middleware/auth');

// 신고 이유 라벨
const REPORT_REASON_LABELS = {
  fraud: '사기/사칭',
  no_show: '노쇼 (거래 약속 불이행)',
  rude: '욕설/비매너',
  fake_item: '허위 매물',
  price_change: '가격 변경/바가지',
  other: '기타'
};

// 사용자 신고하기
router.post('/', auth, async (req, res) => {
  const { tradeId, reportedUserId, reason, description } = req.body;
  const reporterId = req.user.id;

  // Validation
  if (!reportedUserId || !reason || !description) {
    return res.status(400).json({ error: '필수 항목을 입력해주세요' });
  }

  if (!Object.keys(REPORT_REASON_LABELS).includes(reason)) {
    return res.status(400).json({ error: '올바르지 않은 신고 사유입니다' });
  }

  if (description.length < 10) {
    return res.status(400).json({ error: '신고 사유를 10자 이상 입력해주세요' });
  }

  // 자기 자신 신고 방지
  if (reporterId === reportedUserId) {
    return res.status(400).json({ error: '본인을 신고할 수 없습니다' });
  }

  try {
    // 거래 관련 신고인 경우
    if (tradeId) {
      // 1. 거래 확인
      db.get(`
        SELECT * FROM trades WHERE id = ?
      `, [tradeId], (err, trade) => {
        if (err) {
          console.error('Trade fetch error:', err);
          return res.status(500).json({ error: '거래 조회 중 오류가 발생했습니다' });
        }

        if (!trade) {
          return res.status(404).json({ error: '거래를 찾을 수 없습니다' });
        }

        // 2. 거래 참여자 확인 (판매자 또는 구매자만 신고 가능)
        if (trade.user_id !== reporterId && trade.buyer_id !== reporterId) {
          return res.status(403).json({ error: '거래 참여자만 신고할 수 있습니다' });
        }

        // 3. 중복 신고 확인
        db.get(`
          SELECT * FROM user_reports
          WHERE trade_id = ? AND reporter_id = ? AND reported_user_id = ?
        `, [tradeId, reporterId, reportedUserId], (err, existingReport) => {
          if (err) {
            console.error('Report check error:', err);
            return res.status(500).json({ error: '신고 확인 중 오류가 발생했습니다' });
          }

          if (existingReport) {
            return res.status(400).json({ error: '이미 신고하셨습니다' });
          }

          // 4. 신고 저장
          saveReport(tradeId, reporterId, reportedUserId, reason, description, res);
        });
      });
    } else {
      // 거래와 무관한 일반 신고 (추후 확장용)
      saveReport(null, reporterId, reportedUserId, reason, description, res);
    }
  } catch (error) {
    console.error('Report creation error:', error);
    res.status(500).json({ error: '신고 처리 중 오류가 발생했습니다' });
  }
});

// 신고 저장 함수
const saveReport = (tradeId, reporterId, reportedUserId, reason, description, res) => {
  db.run(`
    INSERT INTO user_reports (trade_id, reporter_id, reported_user_id, reason, description)
    VALUES (?, ?, ?, ?, ?)
  `, [tradeId, reporterId, reportedUserId, reason, description], function(err) {
    if (err) {
      console.error('Report insert error:', err);
      return res.status(500).json({ error: '신고 저장 중 오류가 발생했습니다' });
    }

    // 신고 당한 사용자의 신고 횟수 증가
    db.run(`
      UPDATE users
      SET received_reports_count = received_reports_count + 1
      WHERE id = ?
    `, [reportedUserId], (err) => {
      if (err) {
        console.error('Report count update error:', err);
      }
    });

    // 저장된 신고 정보 반환
    db.get(`
      SELECT r.*,
             reporter.username as reporter_username,
             reported.username as reported_username
      FROM user_reports r
      JOIN users reporter ON r.reporter_id = reporter.id
      JOIN users reported ON r.reported_user_id = reported.id
      WHERE r.id = ?
    `, [this.lastID], (err, report) => {
      if (err) {
        console.error('Report fetch error:', err);
        return res.status(500).json({ error: '신고 조회 중 오류가 발생했습니다' });
      }

      res.status(201).json({
        ...report,
        reason_label: REPORT_REASON_LABELS[report.reason]
      });
    });
  });
};

// 내가 한 신고 목록 조회
router.get('/my-reports', auth, async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  db.all(`
    SELECT r.*,
           reported.username as reported_username,
           reported.discord_avatar as reported_avatar
    FROM user_reports r
    JOIN users reported ON r.reported_user_id = reported.id
    WHERE r.reporter_id = ?
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `, [req.user.id, limit, offset], (err, reports) => {
    if (err) {
      console.error('My reports fetch error:', err);
      return res.status(500).json({ error: '신고 목록 조회 중 오류가 발생했습니다' });
    }

    // 총 개수 조회
    db.get(`
      SELECT COUNT(*) as total FROM user_reports WHERE reporter_id = ?
    `, [req.user.id], (err, countResult) => {
      if (err) {
        console.error('Report count error:', err);
        return res.status(500).json({ error: '신고 개수 조회 중 오류가 발생했습니다' });
      }

      // 라벨 추가
      const reportsWithLabels = reports.map(report => ({
        ...report,
        reason_label: REPORT_REASON_LABELS[report.reason]
      }));

      res.json({
        reports: reportsWithLabels,
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

// 특정 사용자에 대한 신고 조회 (본인 또는 관리자만)
router.get('/user/:userId', auth, async (req, res) => {
  const { userId } = req.params;

  // 본인 또는 관리자만 조회 가능
  // TODO: 관리자 권한 확인 로직 추가
  if (req.user.id !== parseInt(userId)) {
    return res.status(403).json({ error: '권한이 없습니다' });
  }

  db.all(`
    SELECT r.*,
           reporter.username as reporter_username
    FROM user_reports r
    JOIN users reporter ON r.reporter_id = reporter.id
    WHERE r.reported_user_id = ?
    ORDER BY r.created_at DESC
  `, [userId], (err, reports) => {
    if (err) {
      console.error('User reports fetch error:', err);
      return res.status(500).json({ error: '신고 목록 조회 중 오류가 발생했습니다' });
    }

    // 라벨 추가
    const reportsWithLabels = reports.map(report => ({
      ...report,
      reason_label: REPORT_REASON_LABELS[report.reason]
    }));

    res.json(reportsWithLabels);
  });
});

// 신고 취소 (아직 검토되지 않은 경우만)
router.delete('/:reportId', auth, async (req, res) => {
  const { reportId } = req.params;

  db.get(`
    SELECT * FROM user_reports WHERE id = ?
  `, [reportId], (err, report) => {
    if (err) {
      console.error('Report fetch error:', err);
      return res.status(500).json({ error: '신고 조회 중 오류가 발생했습니다' });
    }

    if (!report) {
      return res.status(404).json({ error: '신고를 찾을 수 없습니다' });
    }

    // 본인의 신고만 취소 가능
    if (report.reporter_id !== req.user.id) {
      return res.status(403).json({ error: '권한이 없습니다' });
    }

    // 아직 검토되지 않은 경우만 취소 가능
    if (report.status !== 'pending') {
      return res.status(400).json({ error: '이미 검토 중이거나 처리된 신고는 취소할 수 없습니다' });
    }

    db.run(`
      DELETE FROM user_reports WHERE id = ?
    `, [reportId], (err) => {
      if (err) {
        console.error('Report delete error:', err);
        return res.status(500).json({ error: '신고 취소 중 오류가 발생했습니다' });
      }

      // 신고 횟수 감소
      db.run(`
        UPDATE users
        SET received_reports_count = CASE
          WHEN received_reports_count > 0 THEN received_reports_count - 1
          ELSE 0
        END
        WHERE id = ?
      `, [report.reported_user_id], (err) => {
        if (err) {
          console.error('Report count update error:', err);
        }
      });

      res.json({ message: '신고가 취소되었습니다' });
    });
  });
});

module.exports = router;
