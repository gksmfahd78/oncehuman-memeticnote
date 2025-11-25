const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Create a new clan
router.post('/', async (req, res) => {
  try {
    const { clanName } = req.body;
    const userId = req.user.id;

    if (!clanName) {
      return res.status(400).json({ error: 'Clan name is required' });
    }

    // Check if user is already a master of a clan
    const existingClan = await db.query(
      'SELECT * FROM clans WHERE master_id = $1',
      [userId]
    );

    if (existingClan.rows.length > 0) {
      return res.status(400).json({ error: 'You are already a master of a clan' });
    }

    // Create clan
    const clanResult = await db.query(
      'INSERT INTO clans (clan_name, master_id) VALUES ($1, $2) RETURNING *',
      [clanName, userId]
    );

    const clan = clanResult.rows[0];

    // Add master as a member
    await db.query(
      'INSERT INTO clan_members (clan_id, user_id, role) VALUES ($1, $2, $3)',
      [clan.id, userId, 'master']
    );

    res.status(201).json({
      id: clan.id,
      clanName: clan.clan_name,
      masterId: clan.master_id,
      createdAt: clan.created_at
    });
  } catch (error) {
    console.error('Create clan error:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Clan name already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's clans
router.get('/my-clans', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT c.*, cm.role, u.username as master_username
       FROM clans c
       JOIN clan_members cm ON c.id = cm.clan_id
       JOIN users u ON c.master_id = u.id
       WHERE cm.user_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );

    res.json(result.rows.map(clan => ({
      id: clan.id,
      clanName: clan.clan_name,
      masterId: clan.master_id,
      masterUsername: clan.master_username,
      role: clan.role,
      createdAt: clan.created_at
    })));
  } catch (error) {
    console.error('Get clans error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get clan details with members
router.get('/:clanId', async (req, res) => {
  try {
    const { clanId } = req.params;
    const userId = req.user.id;

    // Check if user is a member of this clan
    const memberCheck = await db.query(
      'SELECT * FROM clan_members WHERE clan_id = $1 AND user_id = $2',
      [clanId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this clan' });
    }

    // Get clan details
    const clanResult = await db.query(
      `SELECT c.*, u.username as master_username
       FROM clans c
       JOIN users u ON c.master_id = u.id
       WHERE c.id = $1`,
      [clanId]
    );

    if (clanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Clan not found' });
    }

    // Get clan members
    const membersResult = await db.query(
      `SELECT u.id, u.username, u.game_character_name, cm.role, cm.joined_at
       FROM clan_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.clan_id = $1
       ORDER BY cm.role DESC, cm.joined_at ASC`,
      [clanId]
    );

    const clan = clanResult.rows[0];
    res.json({
      id: clan.id,
      clanName: clan.clan_name,
      masterId: clan.master_id,
      masterUsername: clan.master_username,
      createdAt: clan.created_at,
      members: membersResult.rows.map(member => ({
        id: member.id,
        username: member.username,
        gameCharacterName: member.game_character_name,
        role: member.role,
        joinedAt: member.joined_at
      }))
    });
  } catch (error) {
    console.error('Get clan details error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add member to clan (master only)
router.post('/:clanId/members', async (req, res) => {
  try {
    const { clanId } = req.params;
    const { username } = req.body;
    const userId = req.user.id;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Check if user is master of this clan
    const clanCheck = await db.query(
      'SELECT * FROM clans WHERE id = $1 AND master_id = $2',
      [clanId, userId]
    );

    if (clanCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only clan master can add members' });
    }

    // Find user to add
    const userResult = await db.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newMemberId = userResult.rows[0].id;

    // Check if already a member
    const memberCheck = await db.query(
      'SELECT * FROM clan_members WHERE clan_id = $1 AND user_id = $2',
      [clanId, newMemberId]
    );

    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    // Add member
    await db.query(
      'INSERT INTO clan_members (clan_id, user_id, role) VALUES ($1, $2, $3)',
      [clanId, newMemberId, 'member']
    );

    res.status(201).json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove member from clan (master only)
router.delete('/:clanId/members/:memberId', async (req, res) => {
  try {
    const { clanId, memberId } = req.params;
    const userId = req.user.id;

    // Check if user is master of this clan
    const clanCheck = await db.query(
      'SELECT * FROM clans WHERE id = $1 AND master_id = $2',
      [clanId, userId]
    );

    if (clanCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only clan master can remove members' });
    }

    // Can't remove master
    if (parseInt(memberId) === userId) {
      return res.status(400).json({ error: 'Cannot remove clan master' });
    }

    // Remove member
    const result = await db.query(
      'DELETE FROM clan_members WHERE clan_id = $1 AND user_id = $2',
      [clanId, memberId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Member not found in clan' });
    }

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Leave clan (non-master members)
router.post('/:clanId/leave', async (req, res) => {
  try {
    const { clanId } = req.params;
    const userId = req.user.id;

    // Check if user is master
    const clanCheck = await db.query(
      'SELECT * FROM clans WHERE id = $1 AND master_id = $2',
      [clanId, userId]
    );

    if (clanCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Clan master cannot leave. Delete the clan instead.' });
    }

    // Remove member
    const result = await db.query(
      'DELETE FROM clan_members WHERE clan_id = $1 AND user_id = $2',
      [clanId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'You are not a member of this clan' });
    }

    res.json({ message: 'Left clan successfully' });
  } catch (error) {
    console.error('Leave clan error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
