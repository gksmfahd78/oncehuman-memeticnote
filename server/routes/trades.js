const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const checkBan = require('../middleware/checkBan');

const router = express.Router();

// Get all trades (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { status, listing_type, trade_type, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let countQuery = `
      SELECT COUNT(*) as total
      FROM trades t
      WHERE 1=1
    `;
    let query = `
      SELECT
        t.*,
        u.id as seller_id,
        u.uid as seller_uid,
        u.username as seller_username,
        u.discord_username as seller_discord_username,
        u.discord_avatar as seller_discord_avatar
      FROM trades t
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND t.status = ?';
      countQuery += ' AND t.status = ?';
      params.push(status);
    }

    if (listing_type) {
      query += ' AND t.listing_type = ?';
      countQuery += ' AND t.listing_type = ?';
      params.push(listing_type);
    }

    if (trade_type) {
      query += ' AND t.trade_type = ?';
      countQuery += ' AND t.trade_type = ?';
      params.push(trade_type);
    }

    // Get total count
    const countResult = await db.get(countQuery, params);
    const total = countResult.total;

    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const trades = await db.query(query, params);

    res.json({
      trades,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ error: '거래 목록 조회 중 오류가 발생했습니다' });
  }
});

// Get single trade by ID
router.get('/:id', async (req, res) => {
  try {
    const trade = await db.get(`
      SELECT
        t.*,
        u.id as seller_id,
        u.uid as seller_uid,
        u.username as seller_username,
        u.discord_username as seller_discord_username,
        u.discord_avatar as seller_discord_avatar,
        u.discord_created_at as seller_discord_created_at,
        buyer.id as buyer_user_id,
        buyer.username as buyer_username,
        buyer.discord_username as buyer_discord_username,
        buyer.discord_avatar as buyer_discord_avatar
      FROM trades t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN users buyer ON t.buyer_id = buyer.id
      WHERE t.id = ?
    `, [req.params.id]);

    if (!trade) {
      return res.status(404).json({ error: '거래를 찾을 수 없습니다' });
    }

    res.json(trade);
  } catch (error) {
    console.error('Get trade error:', error);
    res.status(500).json({ error: '거래 조회 중 오류가 발생했습니다' });
  }
});

// Create new trade
router.post('/', authMiddleware, checkBan, async (req, res) => {
  try {
    const { title, description, item_name, price, listing_type = 'sell', trade_type, server_name } = req.body;

    // Validation
    if (!title || !description || !item_name || !trade_type) {
      return res.status(400).json({ error: '필수 항목을 모두 입력해주세요' });
    }

    if (!['sell', 'buy'].includes(listing_type)) {
      return res.status(400).json({ error: '유효하지 않은 거래 타입입니다' });
    }

    if (!['server', 'eternalland'].includes(trade_type)) {
      return res.status(400).json({ error: '유효하지 않은 거래 방법입니다' });
    }

    if (trade_type === 'server' && !server_name) {
      return res.status(400).json({ error: '서버 직거래는 서버 이름이 필요합니다' });
    }

    const result = await db.run(`
      INSERT INTO trades (user_id, title, description, item_name, price, listing_type, trade_type, server_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+9 hours'), datetime('now', '+9 hours'))
    `, [req.user.id, title, description, item_name, price, listing_type, trade_type, server_name]);

    const newTrade = await db.get(`
      SELECT
        t.*,
        u.id as seller_id,
        u.username as seller_username,
        u.discord_username as seller_discord_username,
        u.discord_avatar as seller_discord_avatar
      FROM trades t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `, [result.id]);

    res.status(201).json(newTrade);
  } catch (error) {
    console.error('Create trade error:', error);
    res.status(500).json({ error: '거래 등록 중 오류가 발생했습니다' });
  }
});

// Update trade
router.put('/:id', authMiddleware, checkBan, async (req, res) => {
  try {
    const { title, description, item_name, price, listing_type, trade_type, server_name, status } = req.body;

    // Check if trade exists and belongs to user
    const trade = await db.get('SELECT * FROM trades WHERE id = ?', [req.params.id]);
    if (!trade) {
      return res.status(404).json({ error: '거래를 찾을 수 없습니다' });
    }

    if (trade.user_id !== req.user.id) {
      return res.status(403).json({ error: '권한이 없습니다' });
    }

    // Validation
    if (listing_type && !['sell', 'buy'].includes(listing_type)) {
      return res.status(400).json({ error: '유효하지 않은 거래 타입입니다' });
    }

    if (trade_type && !['server', 'eternalland'].includes(trade_type)) {
      return res.status(400).json({ error: '유효하지 않은 거래 방법입니다' });
    }

    if (status && !['active', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: '유효하지 않은 상태입니다' });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (item_name !== undefined) {
      updates.push('item_name = ?');
      params.push(item_name);
    }
    if (price !== undefined) {
      updates.push('price = ?');
      params.push(price);
    }
    if (listing_type !== undefined) {
      updates.push('listing_type = ?');
      params.push(listing_type);
    }
    if (trade_type !== undefined) {
      updates.push('trade_type = ?');
      params.push(trade_type);
    }
    if (server_name !== undefined) {
      updates.push('server_name = ?');
      params.push(server_name);
    }
    if (status !== undefined) {
      // 거래 완료로 변경하는 것은 허용하지 않음 (양방향 확인 시스템만 사용)
      if (status === 'completed') {
        return res.status(400).json({ error: '거래 완료는 양측 확인을 통해서만 가능합니다. /confirm 엔드포인트를 사용하세요.' });
      }

      updates.push('status = ?');
      params.push(status);

      // 거래 취소 시 확인 플래그 초기화
      if (status === 'cancelled') {
        updates.push('seller_confirmed = 0');
        updates.push('buyer_confirmed = 0');
      }
    }

    updates.push("updated_at = datetime('now', '+9 hours')");

    if (updates.length === 1) {
      return res.status(400).json({ error: '업데이트할 항목이 없습니다' });
    }

    params.push(req.params.id);

    await db.run(
      `UPDATE trades SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updatedTrade = await db.get(`
      SELECT
        t.*,
        u.id as seller_id,
        u.username as seller_username,
        u.discord_username as seller_discord_username,
        u.discord_avatar as seller_discord_avatar
      FROM trades t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `, [req.params.id]);

    res.json(updatedTrade);
  } catch (error) {
    console.error('Update trade error:', error);
    res.status(500).json({ error: '거래 수정 중 오류가 발생했습니다' });
  }
});

// Request to join trade (거래 요청)
router.post('/:id/request', authMiddleware, checkBan, async (req, res) => {
  try {
    const { message } = req.body;
    const trade = await db.get('SELECT * FROM trades WHERE id = ?', [req.params.id]);

    if (!trade) {
      return res.status(404).json({ error: '거래를 찾을 수 없습니다' });
    }

    if (trade.user_id === req.user.id) {
      return res.status(400).json({ error: '본인의 거래에는 요청할 수 없습니다' });
    }

    if (trade.status !== 'active') {
      return res.status(400).json({ error: '진행 중인 거래만 요청할 수 있습니다' });
    }

    if (trade.buyer_id) {
      return res.status(400).json({ error: '이미 구매자가 확정된 거래입니다' });
    }

    const existingRequest = await db.get(
      'SELECT * FROM trade_requests WHERE trade_id = ? AND requester_id = ?',
      [req.params.id, req.user.id]
    );

    if (existingRequest) {
      return res.status(400).json({ error: '이미 요청하셨습니다' });
    }

    // Save trade request
    await db.run(
      'INSERT INTO trade_requests (trade_id, requester_id, message) VALUES (?, ?, ?)',
      [req.params.id, req.user.id, message || '']
    );

    // Create initial chat message so it appears in chat list
    const chatMessage = message || '거래 요청합니다.';
    await db.run(
      `INSERT INTO chat_messages (trade_id, sender_id, receiver_id, message, is_filtered, filtered_message)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [req.params.id, req.user.id, trade.user_id, chatMessage, chatMessage]
    );

    res.json({ message: '거래 요청이 전송되었습니다' });
  } catch (error) {
    console.error('Request trade error:', error);
    res.status(500).json({ error: '거래 요청 중 오류가 발생했습니다' });
  }
});

// Get trade requests (판매자용)
router.get('/:id/requests', authMiddleware, async (req, res) => {
  try {
    const trade = await db.get('SELECT * FROM trades WHERE id = ?', [req.params.id]);

    if (!trade) {
      return res.status(404).json({ error: '거래를 찾을 수 없습니다' });
    }

    if (trade.user_id !== req.user.id) {
      return res.status(403).json({ error: '권한이 없습니다' });
    }

    const requests = await db.query(`
      SELECT
        tr.*,
        u.username as requester_username,
        u.discord_avatar as requester_avatar,
        u.discord_username as requester_discord_username
      FROM trade_requests tr
      JOIN users u ON tr.requester_id = u.id
      WHERE tr.trade_id = ?
      ORDER BY tr.created_at DESC
    `, [req.params.id]);

    const requestsWithStats = await Promise.all(requests.map(async (request) => {
      try {
        const stats = await db.get(`
          SELECT
            u.trust_score,
            u.completed_trades_count,
            COUNT(r.id) as total_reviews,
            SUM(CASE WHEN r.rating = 'positive' THEN 1 ELSE 0 END) as positive_reviews,
            SUM(CASE WHEN r.rating = 'neutral' THEN 1 ELSE 0 END) as neutral_reviews,
            SUM(CASE WHEN r.rating = 'negative' THEN 1 ELSE 0 END) as negative_reviews
          FROM users u
          LEFT JOIN trade_reviews r ON u.id = r.reviewed_user_id
          WHERE u.id = ?
          GROUP BY u.id
        `, [request.requester_id]);

        return { ...request, stats };
      } catch (err) {
        return request;
      }
    }));

    res.json(requestsWithStats);
  } catch (error) {
    console.error('Get trade requests error:', error);
    res.status(500).json({ error: '요청 목록 조회 중 오류가 발생했습니다' });
  }
});

// Accept trade request
router.post('/:id/requests/:requestId/accept', authMiddleware, checkBan, async (req, res) => {
  try {
    const trade = await db.get('SELECT * FROM trades WHERE id = ?', [req.params.id]);
    const request = await db.get('SELECT * FROM trade_requests WHERE id = ?', [req.params.requestId]);

    if (!trade || !request) {
      return res.status(404).json({ error: '거래 또는 요청을 찾을 수 없습니다' });
    }

    if (trade.user_id !== req.user.id) {
      return res.status(403).json({ error: '권한이 없습니다' });
    }

    if (trade.buyer_id) {
      return res.status(400).json({ error: '이미 구매자가 확정된 거래입니다' });
    }

    await db.run('UPDATE trades SET buyer_id = ? WHERE id = ?', [request.requester_id, req.params.id]);
    await db.run('UPDATE trade_requests SET status = ? WHERE id = ?', ['accepted', req.params.requestId]);
    await db.run(
      'UPDATE trade_requests SET status = ? WHERE trade_id = ? AND id != ?',
      ['rejected', req.params.id, req.params.requestId]
    );

    const updatedTrade = await db.get(`
      SELECT t.*, u.username as seller_username, buyer.username as buyer_username
      FROM trades t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN users buyer ON t.buyer_id = buyer.id
      WHERE t.id = ?
    `, [req.params.id]);

    res.json(updatedTrade);
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({ error: '요청 수락 중 오류가 발생했습니다' });
  }
});

// Reject trade request
router.post('/:id/requests/:requestId/reject', authMiddleware, async (req, res) => {
  try {
    const trade = await db.get('SELECT * FROM trades WHERE id = ?', [req.params.id]);

    if (!trade) {
      return res.status(404).json({ error: '거래를 찾을 수 없습니다' });
    }

    if (trade.user_id !== req.user.id) {
      return res.status(403).json({ error: '권한이 없습니다' });
    }

    await db.run('UPDATE trade_requests SET status = ? WHERE id = ?', ['rejected', req.params.requestId]);

    res.json({ message: '요청이 거절되었습니다' });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ error: '요청 거절 중 오류가 발생했습니다' });
  }
});

// Change buyer (구매자 변경)
router.post('/:id/change-buyer', authMiddleware, checkBan, async (req, res) => {
  try {
    const trade = await db.get('SELECT * FROM trades WHERE id = ?', [req.params.id]);

    if (!trade) {
      return res.status(404).json({ error: '거래를 찾을 수 없습니다' });
    }

    if (trade.user_id !== req.user.id) {
      return res.status(403).json({ error: '권한이 없습니다' });
    }

    if (!trade.buyer_id) {
      return res.status(400).json({ error: '구매자가 확정되지 않은 거래입니다' });
    }

    if (trade.status === 'completed') {
      return res.status(400).json({ error: '이미 완료된 거래는 구매자를 변경할 수 없습니다' });
    }

    // 구매자 정보 및 확인 플래그 초기화
    await db.run(
      'UPDATE trades SET buyer_id = NULL, seller_confirmed = 0, buyer_confirmed = 0 WHERE id = ?',
      [req.params.id]
    );

    // 기존에 수락된 요청을 pending으로 되돌림
    await db.run(
      'UPDATE trade_requests SET status = ? WHERE trade_id = ? AND status = ?',
      ['pending', req.params.id, 'accepted']
    );

    const updatedTrade = await db.get(`
      SELECT
        t.*,
        u.id as seller_id,
        u.uid as seller_uid,
        u.username as seller_username,
        u.discord_username as seller_discord_username,
        u.discord_avatar as seller_discord_avatar
      FROM trades t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `, [req.params.id]);

    res.json(updatedTrade);
  } catch (error) {
    console.error('Change buyer error:', error);
    res.status(500).json({ error: '구매자 변경 중 오류가 발생했습니다' });
  }
});

// Confirm trade completion (거래 완료 확인)
router.post('/:id/confirm', authMiddleware, checkBan, async (req, res) => {
  try {
    const trade = await db.get('SELECT * FROM trades WHERE id = ?', [req.params.id]);

    if (!trade) {
      return res.status(404).json({ error: '거래를 찾을 수 없습니다' });
    }

    // 판매자 또는 구매자만 확인 가능
    const isSeller = trade.user_id === req.user.id;
    const isBuyer = trade.buyer_id === req.user.id;

    if (!isSeller && !isBuyer) {
      return res.status(403).json({ error: '거래 참여자만 확인할 수 있습니다' });
    }

    // 구매자가 설정되지 않은 경우
    if (!trade.buyer_id) {
      return res.status(400).json({ error: '구매자가 참여하지 않은 거래입니다' });
    }

    // 이미 거래가 완료된 경우
    if (trade.status === 'completed') {
      return res.status(400).json({ error: '이미 완료된 거래입니다' });
    }

    // 현재 사용자가 판매자인지 구매자인지 확인하고 해당 필드 업데이트
    if (isSeller) {
      await db.run(
        'UPDATE trades SET seller_confirmed = 1 WHERE id = ?',
        [req.params.id]
      );
    } else if (isBuyer) {
      await db.run(
        'UPDATE trades SET buyer_confirmed = 1 WHERE id = ?',
        [req.params.id]
      );
    }

    // 업데이트된 거래 정보 가져오기
    const updatedTrade = await db.get('SELECT * FROM trades WHERE id = ?', [req.params.id]);

    // 양쪽 모두 확인한 경우에만 거래 완료 처리
    if (updatedTrade.seller_confirmed && updatedTrade.buyer_confirmed && updatedTrade.status !== 'completed') {
      await db.run(
        'UPDATE trades SET status = ? WHERE id = ?',
        ['completed', req.params.id]
      );

      // 판매자와 구매자의 거래 완료 횟수 증가 (최초 완료 시에만)
      await db.run(
        'UPDATE users SET completed_trades_count = completed_trades_count + 1 WHERE id = ? OR id = ?',
        [trade.user_id, trade.buyer_id]
      );
    }

    // 최종 거래 정보 반환
    const finalTrade = await db.get(`
      SELECT
        t.*,
        u.id as seller_id,
        u.uid as seller_uid,
        u.username as seller_username,
        u.discord_username as seller_discord_username,
        u.discord_avatar as seller_discord_avatar,
        buyer.id as buyer_user_id,
        buyer.uid as buyer_uid,
        buyer.username as buyer_username,
        buyer.discord_username as buyer_discord_username,
        buyer.discord_avatar as buyer_discord_avatar
      FROM trades t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN users buyer ON t.buyer_id = buyer.id
      WHERE t.id = ?
    `, [req.params.id]);

    res.json(finalTrade);
  } catch (error) {
    console.error('Confirm trade error:', error);
    res.status(500).json({ error: '거래 확인 중 오류가 발생했습니다' });
  }
});

// Delete trade
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const trade = await db.get('SELECT * FROM trades WHERE id = ?', [req.params.id]);
    if (!trade) {
      return res.status(404).json({ error: '거래를 찾을 수 없습니다' });
    }

    if (trade.user_id !== req.user.id) {
      return res.status(403).json({ error: '권한이 없습니다' });
    }

    await db.run('DELETE FROM trades WHERE id = ?', [req.params.id]);
    res.json({ message: '거래가 삭제되었습니다' });
  } catch (error) {
    console.error('Delete trade error:', error);
    res.status(500).json({ error: '거래 삭제 중 오류가 발생했습니다' });
  }
});

// Get user's trades
router.get('/user/:userId', async (req, res) => {
  try {
    const trades = await db.query(`
      SELECT
        t.*,
        u.id as seller_id,
        u.username as seller_username,
        u.discord_username as seller_discord_username,
        u.discord_avatar as seller_discord_avatar
      FROM trades t
      JOIN users u ON t.user_id = u.id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
    `, [req.params.userId]);

    res.json(trades);
  } catch (error) {
    console.error('Get user trades error:', error);
    res.status(500).json({ error: '거래 목록 조회 중 오류가 발생했습니다' });
  }
});

// Admin: Get all trades with filters
router.get('/admin/trades', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let countQuery = `SELECT COUNT(*) as total FROM trades t WHERE 1=1`;
    let query = `
      SELECT
        t.*,
        u.id as seller_id,
        u.username as seller_username,
        u.email as seller_email,
        u.discord_username as seller_discord_username,
        buyer.username as buyer_username
      FROM trades t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN users buyer ON t.buyer_id = buyer.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND t.status = ?';
      countQuery += ' AND t.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (t.title LIKE ? OR t.description LIKE ? OR u.username LIKE ?)';
      countQuery += ' AND (t.title LIKE ? OR t.description LIKE ? OR u.username LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Get total count
    const countResult = await db.get(countQuery, params);
    const total = countResult.total;

    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const trades = await db.query(query, params);

    res.json({
      trades,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get trades error:', error);
    res.status(500).json({ error: '거래 목록 조회 중 오류가 발생했습니다' });
  }
});

// Admin: Delete individual trade
router.delete('/admin/trades/:id', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Get trade info before deleting
    const trade = await db.get(
      `SELECT t.*, u.username as seller_username
       FROM trades t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`,
      [id]
    );

    if (!trade) {
      return res.status(404).json({ error: '거래를 찾을 수 없습니다' });
    }

    // Delete the trade (CASCADE will handle related records)
    await db.run('DELETE FROM trades WHERE id = ?', [id]);

    console.log(`[Admin] Trade ${id} deleted by admin ${req.user.id}. Reason: ${reason || 'No reason provided'}`);
    console.log(`[Admin] Deleted trade: "${trade.title}" by ${trade.seller_username}`);

    res.json({
      message: '거래가 삭제되었습니다',
      deletedTrade: {
        id: trade.id,
        title: trade.title,
        seller: trade.seller_username
      }
    });
  } catch (error) {
    console.error('Admin delete trade error:', error);
    res.status(500).json({ error: '거래 삭제 중 오류가 발생했습니다' });
  }
});

// Admin: Delete all trades (관리자 전체 삭제)
router.delete('/admin/deleteAll', authMiddleware, adminAuth, async (req, res) => {
  try {
    // Get count before deletion for confirmation
    const countResult = await db.query('SELECT COUNT(*) as total FROM trades');
    const totalTrades = countResult[0].total;

    // Delete all related data first (foreign key constraints)
    await db.run('DELETE FROM trade_requests');
    await db.run('DELETE FROM reviews');

    // Delete all trades
    await db.run('DELETE FROM trades');

    res.json({
      success: true,
      message: `${totalTrades}개의 거래가 모두 삭제되었습니다`,
      deletedCount: totalTrades
    });
  } catch (error) {
    console.error('Delete all trades error:', error);
    res.status(500).json({ error: '거래 삭제 중 오류가 발생했습니다' });
  }
});

// Select buyer from chat (채팅에서 구매자 선택 - 당근마켓 스타일)
router.post('/:id/select-buyer/:buyerId', authMiddleware, checkBan, async (req, res) => {
  try {
    const { id, buyerId } = req.params;

    const trade = await db.get('SELECT * FROM trades WHERE id = ?', [id]);

    if (!trade) {
      return res.status(404).json({ error: '거래를 찾을 수 없습니다' });
    }

    if (trade.user_id !== req.user.id) {
      return res.status(403).json({ error: '판매자만 구매자를 선택할 수 있습니다' });
    }

    if (trade.buyer_id) {
      return res.status(400).json({ error: '이미 구매자가 선택되었습니다' });
    }

    if (trade.status !== 'active') {
      return res.status(400).json({ error: '진행 중인 거래만 구매자를 선택할 수 있습니다' });
    }

    // Verify buyer has chatted about this trade
    const hasChat = await db.get(
      `SELECT 1 FROM chat_messages
       WHERE trade_id = ?
       AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
       LIMIT 1`,
      [id, buyerId, req.user.id, req.user.id, buyerId]
    );

    if (!hasChat) {
      return res.status(400).json({ error: '채팅 기록이 없는 사용자입니다' });
    }

    // Set buyer
    await db.run("UPDATE trades SET buyer_id = ?, updated_at = datetime('now', '+9 hours') WHERE id = ?", [buyerId, id]);

    const updatedTrade = await db.get(`
      SELECT
        t.*,
        seller.id as seller_id,
        seller.uid as seller_uid,
        seller.username as seller_username,
        seller.discord_username as seller_discord_username,
        seller.discord_avatar as seller_discord_avatar,
        seller.discord_created_at as seller_discord_created_at,
        buyer.id as buyer_id,
        buyer.uid as buyer_uid,
        buyer.username as buyer_username,
        buyer.discord_username as buyer_discord_username,
        buyer.discord_avatar as buyer_discord_avatar
      FROM trades t
      JOIN users seller ON t.user_id = seller.id
      LEFT JOIN users buyer ON t.buyer_id = buyer.id
      WHERE t.id = ?
    `, [id]);

    res.json({
      message: '구매자가 선택되었습니다. 거래를 진행해주세요!',
      trade: updatedTrade
    });
  } catch (error) {
    console.error('Select buyer error:', error);
    res.status(500).json({ error: '구매자 선택 중 오류가 발생했습니다' });
  }
});

// Admin: Get statistics
router.get('/admin/stats', authMiddleware, adminAuth, async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT
        COUNT(*) as totalTrades,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeTrades,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedTrades,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledTrades
      FROM trades
    `);

    res.json(stats[0]);
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: '통계 조회 중 오류가 발생했습니다' });
  }
});

module.exports = router;
