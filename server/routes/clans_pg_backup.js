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
      'SELECT * FROM clans WHERE master_user_id = $1',
      [userId]
    );

    if (existingClan.rows.length > 0) {
      return res.status(400).json({ error: 'You are already a master of a clan' });
    }

    // Create clan
    const clanResult = await db.query(
      'INSERT INTO clans (clan_name, master_user_id) VALUES ($1, $2) RETURNING *',
      [clanName, userId]
    );

    const clan = clanResult.rows[0];

    res.status(201).json({
      id: clan.id,
      clanName: clan.clan_name,
      masterUserId: clan.master_user_id,
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

// Get user's clans (all characters)
router.get('/my-clans', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT DISTINCT c.*, cm.role, u.username as master_username,
              ch.id as character_id, ch.character_name, ch.nickname
       FROM clans c
       JOIN clan_members cm ON c.id = cm.clan_id
       JOIN users u ON c.master_user_id = u.id
       LEFT JOIN characters ch ON cm.character_id = ch.id
       WHERE cm.user_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );

    // Group by clan
    const clansMap = new Map();
    result.rows.forEach(row => {
      if (!clansMap.has(row.id)) {
        clansMap.set(row.id, {
          id: row.id,
          clanName: row.clan_name,
          masterUserId: row.master_user_id,
          masterUsername: row.master_username,
          createdAt: row.created_at,
          myCharacters: []
        });
      }
      if (row.character_id) {
        clansMap.get(row.id).myCharacters.push({
          characterId: row.character_id,
          characterName: row.character_name,
          nickname: row.nickname,
          role: row.role
        });
      }
    });

    res.json(Array.from(clansMap.values()));
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

    // Check if user has any character in this clan
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
       JOIN users u ON c.master_user_id = u.id
       WHERE c.id = $1`,
      [clanId]
    );

    if (clanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Clan not found' });
    }

    // Get clan members (characters)
    const membersResult = await db.query(
      `SELECT ch.id, ch.character_name, ch.nickname, u.username as owner_username,
              cm.role, cm.joined_at
       FROM clan_members cm
       JOIN characters ch ON cm.character_id = ch.id
       JOIN users u ON ch.user_id = u.id
       WHERE cm.clan_id = $1
       ORDER BY cm.role DESC, cm.joined_at ASC`,
      [clanId]
    );

    const clan = clanResult.rows[0];
    res.json({
      id: clan.id,
      clanName: clan.clan_name,
      masterUserId: clan.master_user_id,
      masterUsername: clan.master_username,
      createdAt: clan.created_at,
      members: membersResult.rows.map(member => ({
        characterId: member.id,
        characterName: member.character_name,
        nickname: member.nickname,
        ownerUsername: member.owner_username,
        role: member.role,
        joinedAt: member.joined_at
      }))
    });
  } catch (error) {
    console.error('Get clan details error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add character to clan (master only)
router.post('/:clanId/members', async (req, res) => {
  try {
    const { clanId } = req.params;
    const { characterId } = req.body;
    const userId = req.user.id;

    if (!characterId) {
      return res.status(400).json({ error: 'Character ID is required' });
    }

    // Check if user is master of this clan
    const clanCheck = await db.query(
      'SELECT * FROM clans WHERE id = $1 AND master_user_id = $2',
      [clanId, userId]
    );

    if (clanCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only clan master can add members' });
    }

    // Check if character exists
    const characterCheck = await db.query(
      'SELECT * FROM characters WHERE id = $1',
      [characterId]
    );

    if (characterCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const character = characterCheck.rows[0];

    // Check if character is already a member
    const memberCheck = await db.query(
      'SELECT * FROM clan_members WHERE clan_id = $1 AND character_id = $2',
      [clanId, characterId]
    );

    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Character is already a member' });
    }

    // Add character as member
    await db.query(
      'INSERT INTO clan_members (clan_id, character_id, user_id, role) VALUES ($1, $2, $3, $4)',
      [clanId, characterId, character.user_id, 'member']
    );

    res.status(201).json({ message: 'Character added successfully' });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove character from clan (master only)
router.delete('/:clanId/members/:characterId', async (req, res) => {
  try {
    const { clanId, characterId } = req.params;
    const userId = req.user.id;

    // Check if user is master of this clan
    const clanCheck = await db.query(
      'SELECT * FROM clans WHERE id = $1 AND master_user_id = $2',
      [clanId, userId]
    );

    if (clanCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only clan master can remove members' });
    }

    // Remove character
    const result = await db.query(
      'DELETE FROM clan_members WHERE clan_id = $1 AND character_id = $2 AND role != $3',
      [clanId, characterId, 'master']
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Character not found in clan or is clan master' });
    }

    res.json({ message: 'Character removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join clan with character
router.post('/:clanId/join', async (req, res) => {
  try {
    const { clanId } = req.params;
    const { characterId } = req.body;
    const userId = req.user.id;

    if (!characterId) {
      return res.status(400).json({ error: 'Character ID is required' });
    }

    // Check if character belongs to user
    const charCheck = await db.query(
      'SELECT * FROM characters WHERE id = $1 AND user_id = $2',
      [characterId, userId]
    );

    if (charCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Character not found or does not belong to you' });
    }

    // Check if already a member
    const memberCheck = await db.query(
      'SELECT * FROM clan_members WHERE clan_id = $1 AND character_id = $2',
      [clanId, characterId]
    );

    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Character is already a member' });
    }

    // Add character to clan
    await db.query(
      'INSERT INTO clan_members (clan_id, character_id, user_id, role) VALUES ($1, $2, $3, $4)',
      [clanId, characterId, userId, 'member']
    );

    res.status(201).json({ message: 'Joined clan successfully' });
  } catch (error) {
    console.error('Join clan error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Leave clan (remove character)
router.post('/:clanId/leave', async (req, res) => {
  try {
    const { clanId } = req.params;
    const { characterId } = req.body;
    const userId = req.user.id;

    if (!characterId) {
      return res.status(400).json({ error: 'Character ID is required' });
    }

    // Check if character belongs to user
    const charCheck = await db.query(
      'SELECT * FROM characters WHERE id = $1 AND user_id = $2',
      [characterId, userId]
    );

    if (charCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Character not found or does not belong to you' });
    }

    // Check if user is master
    const clanCheck = await db.query(
      'SELECT * FROM clans WHERE id = $1 AND master_user_id = $2',
      [clanId, userId]
    );

    if (clanCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Clan master cannot leave. Delete the clan instead.' });
    }

    // Remove character
    const result = await db.query(
      'DELETE FROM clan_members WHERE clan_id = $1 AND character_id = $2',
      [clanId, characterId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Character is not a member of this clan' });
    }

    res.json({ message: 'Left clan successfully' });
  } catch (error) {
    console.error('Leave clan error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
