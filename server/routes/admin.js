const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// All routes require authentication and admin privileges
router.use(authMiddleware);
router.use(adminAuth);

// ========================================
// USER MANAGEMENT
// ========================================

// Get all users with pagination, search, and filters
router.get('/users', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      sortBy = 'created_at',
      sortOrder = 'desc',
      filter = 'all' // all, banned, inactive, admin
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let whereClause = '1=1';
    const params = [];

    // Search filter
    if (search) {
      whereClause += ' AND (u.username LIKE ? OR u.email LIKE ? OR u.discord_username LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Status filter
    if (filter === 'banned') {
      whereClause += ' AND u.is_banned = 1';
    } else if (filter === 'inactive') {
      whereClause += ' AND u.last_login_at < datetime("now", "-30 days")';
    }

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM users u WHERE ${whereClause}`;
    const countResult = await db.get(countQuery, params);
    const total = countResult.total;

    // Get users
    const validSortColumns = ['created_at', 'username', 'email', 'last_login_at', 'completed_trades_count', 'trust_score'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const query = `
      SELECT
        u.id,
        u.uid,
        u.username,
        u.email,
        u.discord_id,
        u.discord_username,
        u.discord_avatar,
        u.discord_created_at,
        u.is_banned,
        u.ban_until,
        u.ban_reason,
        u.banned_at,
        u.banned_by,
        u.trust_score,
        u.completed_trades_count,
        u.created_at,
        u.last_login_at,
        COUNT(DISTINCT t.id) as total_trades,
        COUNT(DISTINCT cm.id) as clan_memberships
      FROM users u
      LEFT JOIN trades t ON u.id = t.user_id
      LEFT JOIN clan_members cm ON u.id = cm.user_id
      WHERE ${whereClause}
      GROUP BY u.id
      ORDER BY u.${sortColumn} ${order}
      LIMIT ? OFFSET ?
    `;

    const users = await db.query(query, [...params, parseInt(limit), offset]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: '사용자 목록 조회 중 오류가 발생했습니다' });
  }
});

// Get user details
router.get('/users/:id', async (req, res) => {
  try {
    const user = await db.get(`
      SELECT
        u.*,
        COUNT(DISTINCT t.id) as total_trades,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_trades,
        COUNT(DISTINCT CASE WHEN t.status = 'cancelled' THEN t.id END) as cancelled_trades,
        COUNT(DISTINCT r_given.id) as reviews_given,
        COUNT(DISTINCT r_received.id) as reviews_received,
        COUNT(DISTINCT CASE WHEN r_received.rating = 'positive' THEN r_received.id END) as positive_reviews,
        COUNT(DISTINCT CASE WHEN r_received.rating = 'negative' THEN r_received.id END) as negative_reviews,
        COUNT(DISTINCT cm.id) as clan_count
      FROM users u
      LEFT JOIN trades t ON u.id = t.user_id
      LEFT JOIN reviews r_given ON u.id = r_given.reviewer_id
      LEFT JOIN reviews r_received ON u.id = r_received.reviewed_user_id
      LEFT JOIN clan_members cm ON u.id = cm.user_id
      WHERE u.id = ?
      GROUP BY u.id
    `, [req.params.id]);

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    // Get recent activities
    const recentTrades = await db.query(`
      SELECT id, title, status, created_at
      FROM trades
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [req.params.id]);

    const recentReports = await db.query(`
      SELECT cr.*, cm.message
      FROM chat_reports cr
      JOIN chat_messages cm ON cr.message_id = cm.id
      WHERE cm.sender_id = ? OR cr.reported_user_id = ?
      ORDER BY cr.created_at DESC
      LIMIT 10
    `, [req.params.id, req.params.id]);

    res.json({
      user,
      recentTrades,
      recentReports
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: '사용자 정보 조회 중 오류가 발생했습니다' });
  }
});

// Ban user
router.post('/users/:id/ban', async (req, res) => {
  try {
    const { reason, duration } = req.body; // duration: 'permanent' or number of days

    if (!reason) {
      return res.status(400).json({ error: '차단 사유를 입력해주세요' });
    }

    let banUntil = null;
    if (duration !== 'permanent') {
      const days = parseInt(duration);
      if (days > 0) {
        banUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    await db.run(`
      UPDATE users
      SET is_banned = 1,
          ban_until = ?,
          ban_reason = ?,
          banned_at = datetime('now', '+9 hours'),
          banned_by = ?
      WHERE id = ?
    `, [banUntil, reason, req.user.id, req.params.id]);

    res.json({ message: '사용자를 차단했습니다' });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: '사용자 차단 중 오류가 발생했습니다' });
  }
});

// Unban user
router.post('/users/:id/unban', async (req, res) => {
  try {
    await db.run(`
      UPDATE users
      SET is_banned = 0,
          ban_until = NULL,
          ban_reason = NULL,
          banned_at = NULL,
          banned_by = NULL
      WHERE id = ?
    `, [req.params.id]);

    res.json({ message: '사용자 차단을 해제했습니다' });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ error: '차단 해제 중 오류가 발생했습니다' });
  }
});

// ========================================
// STATISTICS DASHBOARD
// ========================================

router.get('/stats/overview', async (req, res) => {
  try {

    // User statistics
    const userStats = await db.get(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at >= datetime('now', '-1 day') THEN 1 END) as new_users_today,
        COUNT(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 END) as new_users_week,
        COUNT(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 END) as new_users_month,
        COUNT(CASE WHEN is_banned = 1 THEN 1 END) as banned_users,
        COUNT(CASE WHEN last_login_at >= datetime('now', '-1 day') THEN 1 END) as active_users_today,
        COUNT(CASE WHEN last_login_at >= datetime('now', '-7 days') THEN 1 END) as active_users_week,
        COUNT(CASE WHEN last_login_at >= datetime('now', '-30 days') THEN 1 END) as active_users_month
      FROM users
    `);

    // Trade statistics
    const tradeStats = await db.get(`
      SELECT
        COUNT(*) as total_trades,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_trades,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_trades,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_trades,
        COUNT(CASE WHEN created_at >= datetime('now', '-1 day') THEN 1 END) as trades_today,
        COUNT(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 END) as trades_week,
        COUNT(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 END) as trades_month
      FROM trades
    `);

    // Chat statistics
    const chatStats = await db.get(`
      SELECT
        COUNT(*) as total_messages,
        COUNT(CASE WHEN is_filtered = 1 THEN 1 END) as filtered_messages,
        COUNT(CASE WHEN created_at >= datetime('now', '-1 day') THEN 1 END) as messages_today,
        COUNT(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 END) as messages_week
      FROM chat_messages
    `);

    // Report statistics
    const reportStats = await db.get(`
      SELECT
        COUNT(*) as total_reports,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reports,
        COUNT(CASE WHEN status = 'reviewed' THEN 1 END) as reviewed_reports,
        COUNT(CASE WHEN status = 'dismissed' THEN 1 END) as dismissed_reports
      FROM chat_reports
    `);

    // Clan statistics
    const clanStats = await db.get(`
      SELECT
        COUNT(DISTINCT c.id) as total_clans,
        COUNT(cm.id) as total_clan_members,
        AVG(member_counts.member_count) as avg_members_per_clan
      FROM clans c
      LEFT JOIN clan_members cm ON c.id = cm.clan_id
      LEFT JOIN (
        SELECT clan_id, COUNT(*) as member_count
        FROM clan_members
        GROUP BY clan_id
      ) member_counts ON c.id = member_counts.clan_id
    `);

    // Review statistics
    const reviewStats = await db.get(`
      SELECT
        COUNT(*) as total_reviews,
        COUNT(CASE WHEN rating = 'positive' THEN 1 END) as positive_reviews,
        COUNT(CASE WHEN rating = 'neutral' THEN 1 END) as neutral_reviews,
        COUNT(CASE WHEN rating = 'negative' THEN 1 END) as negative_reviews
      FROM reviews
    `);

    // Calculate average trust score from users table
    const trustScoreAvg = await db.get(`
      SELECT AVG(trust_score) as avg_trust_score
      FROM users
      WHERE trust_score IS NOT NULL
    `);

    // Combine review stats with trust score average
    reviewStats.avg_trust_score = trustScoreAvg?.avg_trust_score || 36.5;

    // Daily activity trend (last 7 days)
    const dailyTrend = await db.query(`
      SELECT
        date(created_at) as date,
        COUNT(DISTINCT user_id) as active_users,
        COUNT(*) as trades_created
      FROM trades
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY date DESC
    `);

    res.json({
      users: userStats,
      trades: tradeStats,
      chat: chatStats,
      reports: reportStats,
      clans: clanStats,
      reviews: reviewStats,
      dailyTrend
    });
  } catch (error) {
    // 🔒 보안: 에러 상세 정보는 개발 환경에서만 노출
    if (process.env.NODE_ENV === 'development') {
      console.error('Get stats overview error:', error);
    }
    res.status(500).json({ error: '통계 조회 중 오류가 발생했습니다' });
  }
});

// ========================================
// CLAN MANAGEMENT
// ========================================

router.get('/clans', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', sortBy = 'created_at', sortOrder = 'desc' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = '1=1';
    const params = [];

    if (search) {
      whereClause += ' AND c.clan_name LIKE ?';
      params.push(`%${search}%`);
    }

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM clans c WHERE ${whereClause}`;
    const countResult = await db.get(countQuery, params);
    const total = countResult.total;

    // Get clans
    const validSortColumns = ['created_at', 'clan_name', 'member_count'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const query = `
      SELECT
        c.id,
        c.clan_name,
        c.master_user_id,
        c.created_at,
        u.username as master_username,
        u.discord_username as master_discord_username,
        COUNT(DISTINCT cm.id) as member_count,
        COUNT(DISTINCT m.id) as memetic_count
      FROM clans c
      LEFT JOIN users u ON c.master_user_id = u.id
      LEFT JOIN clan_members cm ON c.id = cm.clan_id
      LEFT JOIN memetics m ON c.id = m.clan_id
      WHERE ${whereClause}
      GROUP BY c.id
      ORDER BY ${sortColumn === 'member_count' ? 'member_count' : `c.${sortColumn}`} ${order}
      LIMIT ? OFFSET ?
    `;

    const clans = await db.query(query, [...params, parseInt(limit), offset]);

    res.json({
      clans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get clans error:', error);
    }
    res.status(500).json({ error: '하이브 목록 조회 중 오류가 발생했습니다' });
  }
});

// Get clan details
router.get('/clans/:id', async (req, res) => {
  try {
    const clan = await db.get(`
      SELECT
        c.*,
        u.username as master_username,
        u.discord_username as master_discord_username,
        u.discord_avatar as master_discord_avatar,
        COUNT(DISTINCT cm.id) as member_count,
        COUNT(DISTINCT m.id) as memetic_count
      FROM clans c
      LEFT JOIN users u ON c.master_user_id = u.id
      LEFT JOIN clan_members cm ON c.id = cm.clan_id
      LEFT JOIN memetics m ON c.id = m.clan_id
      WHERE c.id = ?
      GROUP BY c.id
    `, [req.params.id]);

    if (!clan) {
      return res.status(404).json({ error: '하이브를 찾을 수 없습니다' });
    }

    // Get members
    const members = await db.query(`
      SELECT
        cm.*,
        u.username,
        u.discord_username,
        u.discord_avatar,
        u.trust_score,
        u.completed_trades_count
      FROM clan_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.clan_id = ?
      ORDER BY cm.role DESC, cm.joined_at ASC
    `, [req.params.id]);

    // Get memetics
    const memetics = await db.query(`
      SELECT
        m.*,
        c.character_name,
        u.username as owner_username
      FROM memetics m
      LEFT JOIN characters c ON m.character_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE m.clan_id = ?
      ORDER BY m.level DESC, m.obtained_at DESC
    `, [req.params.id]);

    res.json({
      clan,
      members,
      memetics
    });
  } catch (error) {
    console.error('Get clan details error:', error);
    res.status(500).json({ error: '하이브 정보 조회 중 오류가 발생했습니다' });
  }
});

// Delete clan
router.delete('/clans/:id', async (req, res) => {
  try {
    const { reason } = req.body;

    const clan = await db.get('SELECT clan_name FROM clans WHERE id = ?', [req.params.id]);
    if (!clan) {
      return res.status(404).json({ error: '하이브를 찾을 수 없습니다' });
    }

    // Cascade delete will handle members and memetics
    await db.run('DELETE FROM clans WHERE id = ?', [req.params.id]);

    res.json({
      message: '하이브가 삭제되었습니다',
      deletedClan: {
        id: req.params.id,
        name: clan.clan_name,
        reason: reason || 'No reason provided'
      }
    });
  } catch (error) {
    console.error('Delete clan error:', error);
    res.status(500).json({ error: '하이브 삭제 중 오류가 발생했습니다' });
  }
});

module.exports = router;
