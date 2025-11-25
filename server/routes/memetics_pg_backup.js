const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Valid levels
const VALID_LEVELS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

// Add a new memetic
router.post('/', async (req, res) => {
  try {
    const { clanId, characterId, level, memeticName, memeticType, notes } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!clanId || !characterId || !level || !memeticName) {
      return res.status(400).json({ error: 'Clan ID, character ID, level, and memetic name are required' });
    }

    if (!VALID_LEVELS.includes(parseInt(level))) {
      return res.status(400).json({ error: 'Invalid level. Must be one of: 5, 10, 15, 20, 25, 30, 35, 40, 45, 50' });
    }

    // Check if character belongs to user and is in the clan
    const memberCheck = await db.query(
      `SELECT * FROM clan_members cm
       JOIN characters ch ON cm.character_id = ch.id
       WHERE cm.clan_id = $1 AND cm.character_id = $2 AND ch.user_id = $3`,
      [clanId, characterId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Character is not a member of this clan or does not belong to you' });
    }

    // Insert memetic
    const result = await db.query(
      `INSERT INTO memetics (character_id, clan_id, level, memetic_name, memetic_type, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [characterId, clanId, level, memeticName, memeticType || null, notes || null]
    );

    const memetic = result.rows[0];
    res.status(201).json({
      id: memetic.id,
      characterId: memetic.character_id,
      clanId: memetic.clan_id,
      level: memetic.level,
      memeticName: memetic.memetic_name,
      memeticType: memetic.memetic_type,
      notes: memetic.notes,
      obtainedAt: memetic.obtained_at
    });
  } catch (error) {
    console.error('Add memetic error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all memetics for a clan
router.get('/clan/:clanId', async (req, res) => {
  try {
    const { clanId } = req.params;
    const userId = req.user.id;
    const { level } = req.query;

    // Check if user is a member of the clan
    const memberCheck = await db.query(
      'SELECT * FROM clan_members WHERE clan_id = $1 AND user_id = $2',
      [clanId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this clan' });
    }

    // Build query
    let query = `
      SELECT m.*, ch.character_name, ch.nickname, u.username as owner_username
      FROM memetics m
      JOIN characters ch ON m.character_id = ch.id
      JOIN users u ON ch.user_id = u.id
      WHERE m.clan_id = $1
    `;
    const params = [clanId];

    // Filter by level if provided
    if (level && VALID_LEVELS.includes(parseInt(level))) {
      query += ' AND m.level = $2';
      params.push(level);
    }

    query += ' ORDER BY m.level ASC, m.obtained_at DESC';

    const result = await db.query(query, params);

    res.json(result.rows.map(memetic => ({
      id: memetic.id,
      characterId: memetic.character_id,
      characterName: memetic.character_name,
      nickname: memetic.nickname,
      ownerUsername: memetic.owner_username,
      clanId: memetic.clan_id,
      level: memetic.level,
      memeticName: memetic.memetic_name,
      memeticType: memetic.memetic_type,
      notes: memetic.notes,
      obtainedAt: memetic.obtained_at
    })));
  } catch (error) {
    console.error('Get clan memetics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get memetics grouped by level for a clan
router.get('/clan/:clanId/by-level', async (req, res) => {
  try {
    const { clanId } = req.params;
    const userId = req.user.id;

    // Check if user is a member of the clan
    const memberCheck = await db.query(
      'SELECT * FROM clan_members WHERE clan_id = $1 AND user_id = $2',
      [clanId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this clan' });
    }

    // Get all memetics grouped by level
    const result = await db.query(
      `SELECT m.*, ch.character_name, ch.nickname, u.username as owner_username
       FROM memetics m
       JOIN characters ch ON m.character_id = ch.id
       JOIN users u ON ch.user_id = u.id
       WHERE m.clan_id = $1
       ORDER BY m.level ASC, m.obtained_at DESC`,
      [clanId]
    );

    // Group by level
    const groupedMemetics = VALID_LEVELS.reduce((acc, level) => {
      acc[level] = result.rows
        .filter(m => m.level === level)
        .map(memetic => ({
          id: memetic.id,
          characterId: memetic.character_id,
          characterName: memetic.character_name,
          nickname: memetic.nickname,
          ownerUsername: memetic.owner_username,
          clanId: memetic.clan_id,
          level: memetic.level,
          memeticName: memetic.memetic_name,
          memeticType: memetic.memetic_type,
          notes: memetic.notes,
          obtainedAt: memetic.obtained_at
        }));
      return acc;
    }, {});

    res.json(groupedMemetics);
  } catch (error) {
    console.error('Get memetics by level error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's own memetics
router.get('/my-memetics', async (req, res) => {
  try {
    const userId = req.user.id;
    const { clanId, level } = req.query;

    let query = `
      SELECT m.*, c.clan_name
      FROM memetics m
      JOIN clans c ON m.clan_id = c.id
      WHERE m.user_id = $1
    `;
    const params = [userId];

    if (clanId) {
      query += ' AND m.clan_id = $2';
      params.push(clanId);
    }

    if (level && VALID_LEVELS.includes(parseInt(level))) {
      const paramIndex = params.length + 1;
      query += ` AND m.level = $${paramIndex}`;
      params.push(level);
    }

    query += ' ORDER BY m.level ASC, m.obtained_at DESC';

    const result = await db.query(query, params);

    res.json(result.rows.map(memetic => ({
      id: memetic.id,
      userId: memetic.user_id,
      clanId: memetic.clan_id,
      clanName: memetic.clan_name,
      level: memetic.level,
      memeticName: memetic.memetic_name,
      memeticType: memetic.memetic_type,
      notes: memetic.notes,
      obtainedAt: memetic.obtained_at
    })));
  } catch (error) {
    console.error('Get my memetics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a memetic
router.put('/:memeticId', async (req, res) => {
  try {
    const { memeticId } = req.params;
    const { memeticName, memeticType, notes, level } = req.body;
    const userId = req.user.id;

    // Check if memetic exists and belongs to user
    const memeticCheck = await db.query(
      'SELECT * FROM memetics WHERE id = $1 AND user_id = $2',
      [memeticId, userId]
    );

    if (memeticCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Memetic not found or does not belong to you' });
    }

    // Validate level if provided
    if (level && !VALID_LEVELS.includes(parseInt(level))) {
      return res.status(400).json({ error: 'Invalid level' });
    }

    // Update memetic
    const result = await db.query(
      `UPDATE memetics
       SET memetic_name = COALESCE($1, memetic_name),
           memetic_type = COALESCE($2, memetic_type),
           notes = COALESCE($3, notes),
           level = COALESCE($4, level)
       WHERE id = $5
       RETURNING *`,
      [memeticName, memeticType, notes, level, memeticId]
    );

    const memetic = result.rows[0];
    res.json({
      id: memetic.id,
      userId: memetic.user_id,
      clanId: memetic.clan_id,
      level: memetic.level,
      memeticName: memetic.memetic_name,
      memeticType: memetic.memetic_type,
      notes: memetic.notes,
      obtainedAt: memetic.obtained_at
    });
  } catch (error) {
    console.error('Update memetic error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a memetic
router.delete('/:memeticId', async (req, res) => {
  try {
    const { memeticId } = req.params;
    const userId = req.user.id;

    // Delete memetic (only owner can delete)
    const result = await db.query(
      'DELETE FROM memetics WHERE id = $1 AND user_id = $2',
      [memeticId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Memetic not found or does not belong to you' });
    }

    res.json({ message: 'Memetic deleted successfully' });
  } catch (error) {
    console.error('Delete memetic error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
