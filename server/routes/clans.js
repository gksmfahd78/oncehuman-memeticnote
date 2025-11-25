const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// Generate unique invite code
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get clan invite info (public - no auth needed)
router.get('/invite/:inviteCode', async (req, res) => {
  try {
    const { inviteCode } = req.params;

    const clan = await db.get(
      `SELECT c.id, c.clan_name, c.created_at, u.username as master_username,
              (SELECT COUNT(*) FROM clan_members WHERE clan_id = c.id) as member_count
       FROM clans c
       JOIN users u ON c.master_user_id = u.id
       WHERE c.invite_code = ?`,
      [inviteCode]
    );

    if (!clan) {
      return res.status(404).json({ error: '유효하지 않은 초대 코드입니다' });
    }

    res.json({
      id: clan.id,
      clanName: clan.clan_name,
      masterUsername: clan.master_username,
      memberCount: clan.member_count,
      createdAt: clan.created_at
    });
  } catch (error) {
    console.error('Get invite info error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// Request to join clan via invite code (requires auth)
router.post('/join/:inviteCode', authMiddleware, async (req, res) => {
  try {
    const { inviteCode } = req.params;

    // Get clan by invite code
    const clan = await db.get(
      'SELECT * FROM clans WHERE invite_code = ?',
      [inviteCode]
    );

    if (!clan) {
      return res.status(404).json({ error: '유효하지 않은 초대 코드입니다' });
    }

    // Check if already a member
    const existingMember = await db.get(
      'SELECT * FROM clan_members WHERE clan_id = ? AND user_id = ?',
      [clan.id, req.user.id]
    );

    if (existingMember) {
      return res.status(400).json({ error: '이미 하이브 멤버입니다' });
    }

    // Check if already has pending request
    const existingRequest = await db.get(
      'SELECT * FROM clan_join_requests WHERE clan_id = ? AND user_id = ? AND status = ?',
      [clan.id, req.user.id, 'pending']
    );

    if (existingRequest) {
      return res.status(400).json({ error: '이미 가입 신청이 대기 중입니다' });
    }

    // Get or create a default character for this user
    let character = await db.get(
      'SELECT * FROM characters WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );

    if (!character) {
      // Create a default character using username
      const charResult = await db.run(
        'INSERT INTO characters (user_id, character_name) VALUES (?, ?)',
        [req.user.id, req.user.username]
      );
      character = await db.get(
        'SELECT * FROM characters WHERE id = ?',
        [charResult.id]
      );
    }

    // Create join request
    await db.run(
      'INSERT INTO clan_join_requests (clan_id, user_id, character_id, status) VALUES (?, ?, ?, ?)',
      [clan.id, req.user.id, character.id, 'pending']
    );

    res.status(201).json({ message: '가입 신청이 완료되었습니다. 하이브장의 승인을 기다려주세요.' });
  } catch (error) {
    console.error('Join clan error:', error);
    res.status(500).json({ error: '가입 신청 중 서버 오류가 발생했습니다' });
  }
});

// All other routes require authentication
router.use(authMiddleware);

// Get all clans for the current user
router.get('/', async (req, res) => {
  try {
    // Get all clans where the user is a member
    const clans = await db.query(`
      SELECT DISTINCT
        c.id,
        c.clan_name,
        c.master_user_id,
        c.created_at,
        MAX(cm.role) as role,
        u.username as master_username
      FROM clans c
      JOIN clan_members cm ON c.id = cm.clan_id
      JOIN users u ON c.master_user_id = u.id
      WHERE cm.user_id = ?
      GROUP BY c.id, c.clan_name, c.master_user_id, c.created_at, u.username
      ORDER BY c.clan_name ASC
    `, [req.user.id]);

    res.json(clans.map(clan => ({
      id: clan.id,
      clanName: clan.clan_name,
      masterUserId: clan.master_user_id,
      masterUsername: clan.master_username,
      role: clan.role,
      createdAt: clan.created_at
    })));
  } catch (error) {
    console.error('Get clans error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// Get a specific clan by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is a member of this clan
    const membership = await db.get(
      'SELECT * FROM clan_members WHERE clan_id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!membership) {
      return res.status(403).json({ error: '이 하이브의 멤버만 접근할 수 있습니다' });
    }

    // Get clan basic info
    const clan = await db.get(
      'SELECT * FROM clans WHERE id = ?',
      [id]
    );

    if (!clan) {
      return res.status(404).json({ error: '하이브를 찾을 수 없습니다' });
    }

    // Get master username
    const master = await db.get(
      'SELECT username FROM users WHERE id = ?',
      [clan.master_user_id]
    );

    // Get clan members with their details
    const members = await db.query(`
      SELECT
        cm.id,
        cm.role,
        u.id as userId,
        u.username,
        c.character_name as gameCharacterName
      FROM clan_members cm
      JOIN users u ON cm.user_id = u.id
      INNER JOIN characters c ON cm.character_id = c.id
      WHERE cm.clan_id = ?
      ORDER BY
        CASE cm.role
          WHEN 'master' THEN 0
          ELSE 1
        END,
        u.username ASC
    `, [id]);

    res.json({
      id: clan.id,
      clanName: clan.clan_name,
      masterUsername: master?.username || 'Unknown',
      masterId: clan.master_user_id,
      inviteCode: clan.invite_code,
      createdAt: clan.created_at,
      members: members.map(m => ({
        id: m.userId,
        username: m.username,
        gameCharacterName: m.gameCharacterName,
        role: m.role
      }))
    });
  } catch (error) {
    console.error('Get clan error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// Add a member to a clan
router.post('/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;

    // Validate input
    if (!username || !username.trim()) {
      return res.status(400).json({ error: '사용자명을 입력해주세요' });
    }

    // Check if clan exists
    const clan = await db.get(
      'SELECT * FROM clans WHERE id = ?',
      [id]
    );

    if (!clan) {
      return res.status(404).json({ error: '하이브를 찾을 수 없습니다' });
    }

    // Check if user is the master
    if (clan.master_user_id !== req.user.id) {
      return res.status(403).json({ error: '하이브 마스터만 멤버를 추가할 수 있습니다' });
    }

    // Find the user to add
    const userToAdd = await db.get(
      'SELECT * FROM users WHERE username = ?',
      [username.trim()]
    );

    if (!userToAdd) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    // Check if user is already a member
    const existingMember = await db.get(
      'SELECT * FROM clan_members WHERE clan_id = ? AND user_id = ?',
      [id, userToAdd.id]
    );

    if (existingMember) {
      return res.status(400).json({ error: '이미 하이브 멤버입니다' });
    }

    // Get or create a character for this user (default character)
    let character = await db.get(
      'SELECT * FROM characters WHERE user_id = ? LIMIT 1',
      [userToAdd.id]
    );

    if (!character) {
      // Create a default character
      const charResult = await db.run(
        'INSERT INTO characters (user_id, character_name) VALUES (?, ?)',
        [userToAdd.id, username.trim()]
      );
      character = await db.get(
        'SELECT * FROM characters WHERE id = ?',
        [charResult.id]
      );
    }

    // Add user to clan
    await db.run(
      'INSERT INTO clan_members (clan_id, character_id, user_id, role) VALUES (?, ?, ?, ?)',
      [id, character.id, userToAdd.id, 'member']
    );

    res.status(201).json({ message: '멤버가 성공적으로 추가되었습니다' });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: '멤버 추가 중 서버 오류가 발생했습니다' });
  }
});

// Create a new clan
router.post('/', async (req, res) => {
  try {
    const { clanName } = req.body;

    // Validate input
    if (!clanName || !clanName.trim()) {
      return res.status(400).json({ error: '하이브 이름을 입력해주세요' });
    }

    // Generate UUID and invite code
    const clanId = crypto.randomUUID();
    const inviteCode = generateInviteCode();

    // Create clan
    await db.run(
      'INSERT INTO clans (id, clan_name, master_user_id, invite_code) VALUES (?, ?, ?, ?)',
      [clanId, clanName.trim(), req.user.id, inviteCode]
    );

    // Get or create a character for this user
    let character = await db.get(
      'SELECT * FROM characters WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );

    if (!character) {
      // Create a default character
      const charResult = await db.run(
        'INSERT INTO characters (user_id, character_name, clan_id) VALUES (?, ?, ?)',
        [req.user.id, req.user.username, clanId]
      );
      character = await db.get(
        'SELECT * FROM characters WHERE id = ?',
        [charResult.id]
      );
    }

    // Add master as a clan member
    await db.run(
      'INSERT INTO clan_members (clan_id, character_id, user_id, role) VALUES (?, ?, ?, ?)',
      [clanId, character.id, req.user.id, 'master']
    );

    // Get the created clan
    const clan = await db.get(
      'SELECT * FROM clans WHERE id = ?',
      [clanId]
    );

    res.status(201).json({
      id: clan.id,
      clanName: clan.clan_name,
      masterUserId: clan.master_user_id,
      inviteCode: clan.invite_code,
      createdAt: clan.created_at
    });
  } catch (error) {
    console.error('Create clan error:', error);
    res.status(500).json({ error: '하이브 생성 중 서버 오류가 발생했습니다' });
  }
});

// Get pending join requests for clan (master only)
router.get('/:id/requests', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is clan master
    const clan = await db.get(
      'SELECT * FROM clans WHERE id = ? AND master_user_id = ?',
      [id, req.user.id]
    );

    if (!clan) {
      return res.status(403).json({ error: '권한이 없습니다' });
    }

    // Get pending requests
    const requests = await db.query(
      `SELECT
        r.id,
        r.user_id,
        r.character_id,
        r.created_at,
        u.username,
        c.character_name
       FROM clan_join_requests r
       JOIN users u ON r.user_id = u.id
       JOIN characters c ON r.character_id = c.id
       WHERE r.clan_id = ? AND r.status = 'pending'
       ORDER BY r.created_at ASC`,
      [id]
    );

    res.json(requests.map(r => ({
      id: r.id,
      userId: r.user_id,
      username: r.username,
      characterId: r.character_id,
      characterName: r.character_name,
      createdAt: r.created_at
    })));
  } catch (error) {
    console.error('Get join requests error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// Approve/reject join request (master only)
router.post('/:id/requests/:requestId/:action', async (req, res) => {
  try {
    const { id, requestId, action } = req.params;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: '잘못된 액션입니다' });
    }

    // Check if user is clan master
    const clan = await db.get(
      'SELECT * FROM clans WHERE id = ? AND master_user_id = ?',
      [id, req.user.id]
    );

    if (!clan) {
      return res.status(403).json({ error: '권한이 없습니다' });
    }

    // Get join request
    const request = await db.get(
      'SELECT * FROM clan_join_requests WHERE id = ? AND clan_id = ? AND status = ?',
      [requestId, id, 'pending']
    );

    if (!request) {
      return res.status(404).json({ error: '가입 신청을 찾을 수 없습니다' });
    }

    if (action === 'approve') {
      // Add user to clan
      await db.run(
        'INSERT INTO clan_members (clan_id, character_id, user_id, role) VALUES (?, ?, ?, ?)',
        [id, request.character_id, request.user_id, 'member']
      );

      // Update request status
      await db.run(
        'UPDATE clan_join_requests SET status = ?, processed_at = CURRENT_TIMESTAMP, processed_by = ? WHERE id = ?',
        ['approved', req.user.id, requestId]
      );

      res.json({ message: '가입이 승인되었습니다' });
    } else {
      // Update request status
      await db.run(
        'UPDATE clan_join_requests SET status = ?, processed_at = CURRENT_TIMESTAMP, processed_by = ? WHERE id = ?',
        ['rejected', req.user.id, requestId]
      );

      res.json({ message: '가입이 거부되었습니다' });
    }
  } catch (error) {
    console.error('Process join request error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// Regenerate invite code (master only)
router.post('/:id/regenerate-invite', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is clan master
    const clan = await db.get(
      'SELECT * FROM clans WHERE id = ? AND master_user_id = ?',
      [id, req.user.id]
    );

    if (!clan) {
      return res.status(403).json({ error: '권한이 없습니다' });
    }

    const newInviteCode = generateInviteCode();
    await db.run(
      'UPDATE clans SET invite_code = ? WHERE id = ?',
      [newInviteCode, id]
    );

    res.json({ inviteCode: newInviteCode });
  } catch (error) {
    console.error('Regenerate invite code error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// Delete clan (master only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is clan master
    const clan = await db.get(
      'SELECT * FROM clans WHERE id = ? AND master_user_id = ?',
      [id, req.user.id]
    );

    if (!clan) {
      return res.status(403).json({ error: '권한이 없습니다' });
    }

    // Delete clan (cascade will handle related records)
    await db.run('DELETE FROM clans WHERE id = ?', [id]);

    // Clear clan_id from characters that were in this clan
    await db.run('UPDATE characters SET clan_id = NULL WHERE clan_id = ?', [id]);

    // Clear clan_id from memetics that were in this clan
    await db.run('UPDATE memetics SET clan_id = NULL WHERE clan_id = ?', [id]);

    res.json({ message: '하이브가 삭제되었습니다' });
  } catch (error) {
    console.error('Delete clan error:', error);
    res.status(500).json({ error: '하이브 삭제 중 서버 오류가 발생했습니다' });
  }
});

module.exports = router;
