const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// 🔒 버그 제보 Rate Limiting (스팸 방지)
const bugReportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // IP당 시간당 10개까지 제보 가능 (5에서 10으로 증가)
  message: '제보가 너무 많습니다. 1시간 후 다시 시도해주세요.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Submit bug report (auth required - logged in users only)
router.post('/', authMiddleware, bugReportLimiter, async (req, res) => {
  try {
    const { type, title, description } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Basic validation
    if (!type || !title || !description) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요' });
    }

    // 🔒 입력 길이 제한 (보안)
    if (title.length > 200) {
      return res.status(400).json({ error: '제목은 200자를 초과할 수 없습니다' });
    }
    if (description.length > 5000) {
      return res.status(400).json({ error: '내용은 5000자를 초과할 수 없습니다' });
    }

    // Validate type
    if (!['bug', 'feature', 'question'].includes(type)) {
      return res.status(400).json({ error: '잘못된 제보 유형입니다' });
    }

    const result = await db.run(
      `INSERT INTO bug_reports (user_id, type, title, description, email, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
      [userId, type, title, description, userEmail]
    );

    res.status(201).json({
      message: '제보가 성공적으로 전송되었습니다',
      id: result.id
    });
  } catch (error) {
    console.error('Create bug report error:', error);
    res.status(500).json({ error: '제보 전송에 실패했습니다' });
  }
});

// Get all bug reports (admin only)
// 🔒 보안 수정: 관리자 인증 추가
router.get('/', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { status, type } = req.query;

    let query = `
      SELECT
        br.*,
        u.username as reporter_username
      FROM bug_reports br
      LEFT JOIN users u ON br.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND br.status = ?';
      params.push(status);
    }

    if (type) {
      query += ' AND br.type = ?';
      params.push(type);
    }

    query += ' ORDER BY br.created_at DESC';

    const reports = await db.query(query, params);

    res.json(reports);
  } catch (error) {
    console.error('Get bug reports error:', error);
    res.status(500).json({ error: '제보 목록 조회에 실패했습니다' });
  }
});

// Update bug report status (admin only)
// 🔒 보안 수정: 관리자 인증 추가
router.patch('/:id/status', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ error: '잘못된 상태값입니다' });
    }

    // Get bug report details
    const bugReport = await db.get('SELECT * FROM bug_reports WHERE id = ?', [id]);

    if (!bugReport) {
      return res.status(404).json({ error: '제보를 찾을 수 없습니다' });
    }

    await db.run(
      `UPDATE bug_reports
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, id]
    );

    // Note: 답변은 채팅 시스템을 통해 전달됩니다

    res.json({ message: '상태가 업데이트되었습니다' });
  } catch (error) {
    console.error('Update bug report error:', error);
    res.status(500).json({ error: '상태 업데이트에 실패했습니다' });
  }
});

module.exports = router;
