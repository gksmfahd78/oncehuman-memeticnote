const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get user notifications
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, unreadOnly = false } = req.query;

    let query = `
      SELECT *
      FROM user_notifications
      WHERE user_id = ?
    `;
    const params = [userId];

    if (unreadOnly === 'true') {
      query += ' AND is_read = 0';
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const notifications = await db.query(query, params);

    // Get unread count
    const unreadCount = await db.get(
      'SELECT COUNT(*) as count FROM user_notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    res.json({
      notifications,
      unreadCount: unreadCount.count
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: '알림을 불러오는데 실패했습니다' });
  }
});

// Mark notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const notification = await db.get(
      'SELECT * FROM user_notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!notification) {
      return res.status(404).json({ error: '알림을 찾을 수 없습니다' });
    }

    await db.run(
      'UPDATE user_notifications SET is_read = 1 WHERE id = ?',
      [id]
    );

    res.json({ message: '알림을 읽음으로 표시했습니다' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: '알림 업데이트에 실패했습니다' });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', async (req, res) => {
  try {
    const userId = req.user.id;

    await db.run(
      'UPDATE user_notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    res.json({ message: '모든 알림을 읽음으로 표시했습니다' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: '알림 업데이트에 실패했습니다' });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const notification = await db.get(
      'SELECT * FROM user_notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!notification) {
      return res.status(404).json({ error: '알림을 찾을 수 없습니다' });
    }

    await db.run('DELETE FROM user_notifications WHERE id = ?', [id]);

    res.json({ message: '알림이 삭제되었습니다' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: '알림 삭제에 실패했습니다' });
  }
});

module.exports = router;
