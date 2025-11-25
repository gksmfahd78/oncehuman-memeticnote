const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const checkBan = require('../middleware/checkBan');
const { filterMessage, isSpam, calculateRiskScore } = require('../utils/messageFilter');

const router = express.Router();

// Get all my chats (내가 참여한 모든 채팅 목록)
router.get('/my-chats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all distinct trade-user pairs
    const chatPairs = await db.query(
      `SELECT DISTINCT
        m.trade_id,
        CASE
          WHEN m.sender_id = ? THEN m.receiver_id
          ELSE m.sender_id
        END as other_user_id
      FROM chat_messages m
      WHERE m.sender_id = ? OR m.receiver_id = ?`,
      [userId, userId, userId]
    );

    // For each pair, get detailed info
    const chats = [];
    for (const pair of chatPairs) {
      const trade = await db.get(
        'SELECT id, title, status, user_id, buyer_id FROM trades WHERE id = ?',
        [pair.trade_id]
      );

      if (!trade) continue;

      const otherUser = await db.get(
        'SELECT id, uid, username, discord_username, discord_avatar FROM users WHERE id = ?',
        [pair.other_user_id]
      );

      if (!otherUser) continue;

      const lastMessage = await db.get(
        `SELECT message, is_filtered, created_at
         FROM chat_messages
         WHERE trade_id = ?
         AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         ORDER BY created_at DESC LIMIT 1`,
        [pair.trade_id, userId, pair.other_user_id, pair.other_user_id, userId]
      );

      const unreadResult = await db.get(
        `SELECT COUNT(*) as count
         FROM chat_messages
         WHERE trade_id = ?
         AND sender_id = ?
         AND receiver_id = ?
         AND is_read = 0`,
        [pair.trade_id, pair.other_user_id, userId]
      );

      let myRole = 'interested';
      if (trade.user_id === userId) {
        myRole = 'seller';
      } else if (trade.buyer_id === userId) {
        myRole = 'buyer';
      }

      chats.push({
        trade_id: trade.id,
        trade_title: trade.title,
        trade_status: trade.status,
        seller_id: trade.user_id,
        buyer_id: trade.buyer_id,
        other_user_id: otherUser.id,
        other_user_uid: otherUser.uid,
        other_username: otherUser.username,
        other_discord_username: otherUser.discord_username,
        other_discord_avatar: otherUser.discord_avatar,
        last_message: lastMessage?.message || '',
        last_message_filtered: lastMessage?.is_filtered || 0,
        last_message_time: lastMessage?.created_at || null,
        unread_count: unreadResult?.count || 0,
        my_role: myRole
      });
    }

    // Sort by last message time
    chats.sort((a, b) => {
      if (!a.last_message_time) return 1;
      if (!b.last_message_time) return -1;
      return new Date(b.last_message_time) - new Date(a.last_message_time);
    });

    res.json({ chats });
  } catch (error) {
    console.error('Get my chats error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: '채팅 목록 조회 중 오류가 발생했습니다', details: error.message });
  }
});

// Get chat rooms for a user (판매자가 여러 대화 목록 보기)
router.get('/trade/:tradeId/rooms', authMiddleware, async (req, res) => {
  try {
    const { tradeId } = req.params;
    const userId = req.user.id;

    // Get trade info
    const trade = await db.get(
      'SELECT user_id, buyer_id FROM trades WHERE id = ?',
      [tradeId]
    );

    if (!trade) {
      return res.status(404).json({ error: '거래를 찾을 수 없습니다' });
    }

    // Only seller can see all chat rooms
    if (trade.user_id !== userId) {
      return res.status(403).json({ error: '권한이 없습니다' });
    }

    // Get all users who have chatted about this trade
    const chatRooms = await db.query(
      `SELECT DISTINCT
        CASE
          WHEN sender_id = ? THEN receiver_id
          ELSE sender_id
        END as other_user_id,
        u.username,
        u.discord_username,
        u.discord_avatar,
        (SELECT message FROM chat_messages
         WHERE trade_id = ?
         AND (sender_id = other_user_id OR receiver_id = other_user_id)
         ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM chat_messages
         WHERE trade_id = ?
         AND (sender_id = other_user_id OR receiver_id = other_user_id)
         ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM chat_messages
         WHERE trade_id = ?
         AND receiver_id = ?
         AND (sender_id = other_user_id OR receiver_id = other_user_id)
         AND is_read = 0) as unread_count
      FROM chat_messages m
      JOIN users u ON u.id = CASE
        WHEN m.sender_id = ? THEN m.receiver_id
        ELSE m.sender_id
      END
      WHERE m.trade_id = ?
      GROUP BY other_user_id
      ORDER BY last_message_time DESC`,
      [userId, tradeId, tradeId, tradeId, userId, userId, tradeId]
    );

    res.json({ chatRooms, selectedBuyer: trade.buyer_id });
  } catch (error) {
    console.error('Get chat rooms error:', error);
    res.status(500).json({ error: '채팅방 목록 조회 중 오류가 발생했습니다' });
  }
});

// Get chat messages for a trade (특정 사용자와의 대화)
router.get('/trade/:tradeId/user/:otherUserId', authMiddleware, async (req, res) => {
  try {
    const { tradeId, otherUserId } = req.params;
    const userId = req.user.id;

    console.log('=== Chat Messages Request ===');
    console.log('Trade ID:', tradeId);
    console.log('Current User ID:', userId);
    console.log('Other User ID:', otherUserId);

    // Get trade info
    const trade = await db.get(
      'SELECT id, user_id, buyer_id, status, title FROM trades WHERE id = ?',
      [tradeId]
    );

    console.log('Trade found:', trade);

    if (!trade) {
      console.log('Trade not found!');
      return res.status(404).json({ error: '거래를 찾을 수 없습니다' });
    }

    // Check if user is blocked
    const isBlocked = await db.get(
      `SELECT 1 FROM user_blocks
       WHERE (blocker_id = ? AND blocked_id = ?)
       OR (blocker_id = ? AND blocked_id = ?)`,
      [userId, otherUserId, otherUserId, userId]
    );

    if (isBlocked) {
      return res.status(403).json({ error: '차단된 사용자와는 채팅할 수 없습니다' });
    }

    // Get messages between these two users
    const messages = await db.query(
      `SELECT
        m.*,
        sender.username as sender_username,
        sender.discord_username as sender_discord_username,
        sender.discord_avatar as sender_discord_avatar,
        receiver.username as receiver_username
      FROM chat_messages m
      JOIN users sender ON m.sender_id = sender.id
      JOIN users receiver ON m.receiver_id = receiver.id
      WHERE m.trade_id = ?
        AND ((m.sender_id = ? AND m.receiver_id = ?)
         OR (m.sender_id = ? AND m.receiver_id = ?))
      ORDER BY m.created_at ASC`,
      [tradeId, userId, otherUserId, otherUserId, userId]
    );

    console.log('Messages found:', messages.length);

    // Mark messages as read
    await db.run(
      `UPDATE chat_messages
       SET is_read = 1
       WHERE trade_id = ? AND sender_id = ? AND receiver_id = ? AND is_read = 0`,
      [tradeId, otherUserId, userId]
    );

    console.log('Returning messages successfully');
    res.json({
      messages,
      trade: {
        id: trade.id,
        title: trade.title,
        status: trade.status,
        seller_id: trade.user_id,
        buyer_id: trade.buyer_id
      }
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: '메시지 조회 중 오류가 발생했습니다' });
  }
});

// Send a message
router.post('/trade/:tradeId/message', authMiddleware, checkBan, async (req, res) => {
  try {
    const { tradeId } = req.params;
    const { message, receiverId } = req.body;
    const senderId = req.user.id;

    // Validate input
    if (!message || !message.trim()) {
      return res.status(400).json({ error: '메시지를 입력해주세요' });
    }

    if (message.length > 500) {
      return res.status(400).json({ error: '메시지는 500자를 초과할 수 없습니다' });
    }

    if (!receiverId) {
      return res.status(400).json({ error: '수신자를 지정해주세요' });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ error: '자기 자신에게 메시지를 보낼 수 없습니다' });
    }

    // Check if trade exists
    const trade = await db.get(
      'SELECT user_id FROM trades WHERE id = ?',
      [tradeId]
    );

    if (!trade) {
      return res.status(404).json({ error: '거래를 찾을 수 없습니다' });
    }

    // SECURITY: Verify both sender and receiver are participants in this trade
    // TEMPORARY: Trade validation disabled for inquiry chat system
    /*
    // Check if sender is the seller
    const isSeller = trade.user_id === senderId;

    // Check if sender or receiver is the buyer (from trades table)
    const isBuyer = (trade.buyer_id && (trade.buyer_id === senderId || trade.buyer_id === receiverId));

    // Check if users are in accepted trade requests
    const tradeRequest = await db.get(
      `SELECT 1 FROM trade_requests
       WHERE trade_id = ?
       AND status = 'accepted'
       AND requester_id IN (?, ?)`,
      [tradeId, senderId, receiverId]
    );

    // At least one of them must be a valid participant
    if (!isSeller && !isBuyer && !tradeRequest) {
      return res.status(403).json({ error: '이 거래의 참여자만 메시지를 보낼 수 있습니다' });
    }
    */

    // Check if user is blocked
    const isBlocked = await db.get(
      `SELECT 1 FROM user_blocks
       WHERE (blocker_id = ? AND blocked_id = ?)
       OR (blocker_id = ? AND blocked_id = ?)`,
      [senderId, receiverId, receiverId, senderId]
    );

    if (isBlocked) {
      return res.status(403).json({ error: '차단된 사용자에게 메시지를 보낼 수 없습니다' });
    }

    // SECURITY: Check if user is temporarily blocked for spam
    const spamBlock = await db.get(
      `SELECT blocked_until FROM chat_spam_blocks
       WHERE user_id = ? AND trade_id = ?
       AND blocked_until > datetime('now')
       ORDER BY blocked_until DESC LIMIT 1`,
      [senderId, tradeId]
    );

    if (spamBlock) {
      const remainingTime = Math.ceil((new Date(spamBlock.blocked_until) - new Date()) / 1000 / 60);
      return res.status(429).json({
        error: `도배로 인해 메시지 전송이 제한되었습니다. ${remainingTime}분 후 다시 시도해주세요.`,
        code: 'SPAM_BLOCKED',
        blockedUntil: spamBlock.blocked_until
      });
    }

    // SECURITY: Rate limiting - check for rapid message sending (20 messages in 10 seconds = spam)
    const recentRapidMessages = await db.get(
      `SELECT COUNT(*) as count FROM chat_messages
       WHERE trade_id = ? AND sender_id = ?
       AND created_at > datetime('now', '-10 seconds')`,
      [tradeId, senderId]
    );

    if (recentRapidMessages && recentRapidMessages.count >= 20) {
      // Block user for 5 minutes
      await db.run(
        `INSERT INTO chat_spam_blocks (user_id, trade_id, blocked_until, reason)
         VALUES (?, ?, datetime('now', '+5 minutes'), 'rapid_spam')`,
        [senderId, tradeId]
      );

      return res.status(429).json({
        error: '도배 감지! 5분 동안 메시지를 보낼 수 없습니다.',
        code: 'SPAM_DETECTED_BLOCKED',
        blockedUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      });
    }

    // Get recent messages for spam detection
    const recentMessages = await db.query(
      `SELECT message FROM chat_messages
       WHERE trade_id = ? AND sender_id = ?
       ORDER BY created_at DESC LIMIT 5`,
      [tradeId, senderId]
    );

    // Check for spam
    if (isSpam(recentMessages, message)) {
      return res.status(429).json({
        error: '동일한 메시지를 반복해서 보낼 수 없습니다',
        code: 'SPAM_DETECTED'
      });
    }

    // Filter message
    const filterResult = filterMessage(message);
    const riskScore = calculateRiskScore(message);

    // Save message
    const result = await db.run(
      `INSERT INTO chat_messages
       (trade_id, sender_id, receiver_id, message, is_filtered, filtered_message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        tradeId,
        senderId,
        receiverId,
        message,
        filterResult.isFiltered ? 1 : 0,
        filterResult.filteredMessage
      ]
    );

    // If message is highly risky, auto-create a report for admin review
    if (riskScore >= 30) {
      await db.run(
        `INSERT INTO chat_reports
         (message_id, reporter_id, reported_user_id, report_type, description, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          result.id,
          senderId, // System-generated report
          senderId,
          'contact_sharing',
          `자동 감지: 위험도 점수 ${riskScore}점. 사유: ${filterResult.reasons.join(', ')}`,
          'pending'
        ]
      );
    }

    // Get the created message with user info
    const createdMessage = await db.get(
      `SELECT
        m.*,
        sender.username as sender_username,
        sender.discord_username as sender_discord_username,
        sender.discord_avatar as sender_discord_avatar
      FROM chat_messages m
      JOIN users sender ON m.sender_id = sender.id
      WHERE m.id = ?`,
      [result.id]
    );

    res.status(201).json({
      message: createdMessage,
      filtered: filterResult.isFiltered,
      reasons: filterResult.reasons,
      riskScore
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: '메시지 전송 중 오류가 발생했습니다' });
  }
});

// Get unread message count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.get(
      `SELECT COUNT(*) as count
       FROM chat_messages
       WHERE receiver_id = ? AND is_read = 0`,
      [userId]
    );

    res.json({ unreadCount: result.count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: '읽지 않은 메시지 수 조회 중 오류가 발생했습니다' });
  }
});

// Report a message
router.post('/report', authMiddleware, async (req, res) => {
  try {
    const { messageId, reportType, description } = req.body;
    const reporterId = req.user.id;

    // Validate input
    if (!messageId || !reportType) {
      return res.status(400).json({ error: '필수 항목을 입력해주세요' });
    }

    const validTypes = ['spam', 'contact_sharing', 'harassment', 'rmt', 'other'];
    if (!validTypes.includes(reportType)) {
      return res.status(400).json({ error: '올바른 신고 유형을 선택해주세요' });
    }

    // Get message info
    const message = await db.get(
      'SELECT sender_id, receiver_id FROM chat_messages WHERE id = ?',
      [messageId]
    );

    if (!message) {
      return res.status(404).json({ error: '메시지를 찾을 수 없습니다' });
    }

    // Can't report your own message
    if (message.sender_id === reporterId) {
      return res.status(400).json({ error: '자신의 메시지는 신고할 수 없습니다' });
    }

    // Check if already reported by this user
    const existingReport = await db.get(
      `SELECT id FROM chat_reports
       WHERE message_id = ? AND reporter_id = ?`,
      [messageId, reporterId]
    );

    if (existingReport) {
      return res.status(400).json({ error: '이미 신고한 메시지입니다' });
    }

    // Create report
    const result = await db.run(
      `INSERT INTO chat_reports
       (message_id, reporter_id, reported_user_id, report_type, description)
       VALUES (?, ?, ?, ?, ?)`,
      [messageId, reporterId, message.sender_id, reportType, description]
    );

    res.status(201).json({
      message: '신고가 접수되었습니다. 관리자가 검토할 예정입니다.',
      reportId: result.id
    });
  } catch (error) {
    console.error('Report message error:', error);
    res.status(500).json({ error: '신고 처리 중 오류가 발생했습니다' });
  }
});

// Block a user
router.post('/block', authMiddleware, async (req, res) => {
  try {
    const { blockedId } = req.body;
    const blockerId = req.user.id;

    if (!blockedId) {
      return res.status(400).json({ error: '차단할 사용자를 지정해주세요' });
    }

    if (blockerId === blockedId) {
      return res.status(400).json({ error: '자기 자신을 차단할 수 없습니다' });
    }

    // Check if user exists
    const user = await db.get('SELECT id FROM users WHERE id = ?', [blockedId]);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    // Check if already blocked
    const existing = await db.get(
      'SELECT id FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?',
      [blockerId, blockedId]
    );

    if (existing) {
      return res.status(400).json({ error: '이미 차단한 사용자입니다' });
    }

    // Block user
    await db.run(
      'INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (?, ?)',
      [blockerId, blockedId]
    );

    res.status(201).json({ message: '사용자를 차단했습니다' });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: '사용자 차단 중 오류가 발생했습니다' });
  }
});

// Unblock a user
router.delete('/block/:blockedId', authMiddleware, async (req, res) => {
  try {
    const { blockedId } = req.params;
    const blockerId = req.user.id;

    const result = await db.run(
      'DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?',
      [blockerId, blockedId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: '차단 기록을 찾을 수 없습니다' });
    }

    res.json({ message: '차단을 해제했습니다' });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ error: '차단 해제 중 오류가 발생했습니다' });
  }
});

// Get blocked users
router.get('/blocks', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const blockedUsers = await db.query(
      `SELECT
        u.id,
        u.username,
        u.discord_username,
        u.discord_avatar,
        b.created_at as blocked_at
      FROM user_blocks b
      JOIN users u ON b.blocked_id = u.id
      WHERE b.blocker_id = ?
      ORDER BY b.created_at DESC`,
      [userId]
    );

    res.json({ blockedUsers });
  } catch (error) {
    console.error('Get blocked users error:', error);
    res.status(500).json({ error: '차단 목록 조회 중 오류가 발생했습니다' });
  }
});

// Admin: Get all reports
router.get('/admin/reports', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const reports = await db.query(
      `SELECT
        r.*,
        m.message as message_content,
        m.filtered_message,
        reporter.username as reporter_username,
        reported.username as reported_username,
        reported.discord_username as reported_discord_username
      FROM chat_reports r
      JOIN chat_messages m ON r.message_id = m.id
      JOIN users reporter ON r.reporter_id = reporter.id
      JOIN users reported ON r.reported_user_id = reported.id
      WHERE r.status = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?`,
      [status, parseInt(limit), offset]
    );

    const countResult = await db.get(
      'SELECT COUNT(*) as total FROM chat_reports WHERE status = ?',
      [status]
    );

    res.json({
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: '신고 목록 조회 중 오류가 발생했습니다' });
  }
});

// Admin: Review report
router.put('/admin/reports/:reportId', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes, issueWarning, warningSeverity, banUser, banDuration } = req.body;
    const adminId = req.user.id;

    const validStatuses = ['reviewing', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: '올바른 상태를 선택해주세요' });
    }

    // Get report info
    const report = await db.get(
      'SELECT reported_user_id FROM chat_reports WHERE id = ?',
      [reportId]
    );

    if (!report) {
      return res.status(404).json({ error: '신고를 찾을 수 없습니다' });
    }

    // Update report
    await db.run(
      `UPDATE chat_reports
       SET status = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ?, admin_notes = ?
       WHERE id = ?`,
      [status, adminId, adminNotes, reportId]
    );

    // Issue warning if requested
    if (issueWarning && status === 'resolved') {
      await db.run(
        `INSERT INTO user_warnings (user_id, admin_id, reason, severity)
         VALUES (?, ?, ?, ?)`,
        [report.reported_user_id, adminId, adminNotes || '부적절한 채팅 메시지', warningSeverity || 'low']
      );
    }

    // Ban user if requested
    if (banUser && status === 'resolved') {
      let banUntil = null;
      if (banDuration && banDuration !== 'permanent') {
        const days = parseInt(banDuration);
        banUntil = new Date();
        banUntil.setDate(banUntil.getDate() + days);
        banUntil = banUntil.toISOString();
      }

      await db.run(
        `UPDATE users
         SET is_banned = 1, ban_until = ?, ban_reason = ?, banned_at = CURRENT_TIMESTAMP, banned_by = ?
         WHERE id = ?`,
        [banUntil, adminNotes || '부적절한 채팅 메시지', adminId, report.reported_user_id]
      );
    }

    res.json({ message: '신고 검토가 완료되었습니다' });
  } catch (error) {
    console.error('Review report error:', error);
    res.status(500).json({ error: '신고 검토 중 오류가 발생했습니다' });
  }
});

// Admin: Ban user
router.post('/admin/users/:userId/ban', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, duration } = req.body; // duration: 'permanent' or number of days
    const adminId = req.user.id;

    if (!reason) {
      return res.status(400).json({ error: '차단 사유를 입력해주세요' });
    }

    // Check if user exists
    const user = await db.get('SELECT id, username FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    let banUntil = null;
    if (duration !== 'permanent') {
      const days = parseInt(duration);
      if (isNaN(days) || days <= 0) {
        return res.status(400).json({ error: '올바른 정지 기간을 입력해주세요' });
      }
      banUntil = new Date();
      banUntil.setDate(banUntil.getDate() + days);
      banUntil = banUntil.toISOString();
    }

    await db.run(
      `UPDATE users
       SET is_banned = 1, ban_until = ?, ban_reason = ?, banned_at = CURRENT_TIMESTAMP, banned_by = ?
       WHERE id = ?`,
      [banUntil, reason, adminId, userId]
    );

    res.json({
      message: `사용자 ${user.username}를 ${duration === 'permanent' ? '영구 차단' : `${duration}일 정지`}했습니다`
    });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: '사용자 차단 중 오류가 발생했습니다' });
  }
});

// Admin: Unban user
router.post('/admin/users/:userId/unban', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await db.get('SELECT id, username, is_banned FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    if (!user.is_banned) {
      return res.status(400).json({ error: '차단되지 않은 사용자입니다' });
    }

    await db.run(
      `UPDATE users
       SET is_banned = 0, ban_until = NULL, ban_reason = NULL, banned_at = NULL, banned_by = NULL
       WHERE id = ?`,
      [userId]
    );

    res.json({ message: `사용자 ${user.username}의 차단을 해제했습니다` });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ error: '차단 해제 중 오류가 발생했습니다' });
  }
});

// Admin: Get user sanctions info
router.get('/admin/users/:userId/sanctions', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await db.get(
      `SELECT id, username, email, is_banned, ban_until, ban_reason, banned_at, banned_by
       FROM users WHERE id = ?`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    // Get warnings
    const warnings = await db.query(
      `SELECT w.*, a.username as admin_username
       FROM user_warnings w
       JOIN users a ON w.admin_id = a.id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [userId]
    );

    // Get reports
    const reports = await db.query(
      `SELECT r.*,
         reporter.username as reporter_username,
         m.message as message_content
       FROM chat_reports r
       JOIN users reporter ON r.reporter_id = reporter.id
       JOIN chat_messages m ON r.message_id = m.id
       WHERE r.reported_user_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    res.json({
      user,
      warnings,
      reports,
      totalWarnings: warnings.length,
      totalReports: reports.length,
      resolvedReports: reports.filter(r => r.status === 'resolved').length
    });
  } catch (error) {
    console.error('Get user sanctions error:', error);
    res.status(500).json({ error: '사용자 제재 정보 조회 중 오류가 발생했습니다' });
  }
});

module.exports = router;
