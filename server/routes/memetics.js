const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get clan memetics grouped by level (must be before /:memeticId route)
router.get('/clan/:clanId/by-level', async (req, res) => {
  try {
    const { clanId } = req.params;

    // Get all memetics for the clan with user info
    // Use clan_members table to find all characters in the clan
    const memetics = await db.query(`
      SELECT
        m.*,
        u.id as user_id,
        u.username,
        c.id as char_id,
        c.character_name as gameCharacterName
      FROM memetics m
      JOIN characters c ON m.character_id = c.id
      JOIN users u ON c.user_id = u.id
      JOIN clan_members cm ON c.id = cm.character_id
      WHERE cm.clan_id = ?
      ORDER BY m.level ASC, m.obtained_at DESC
    `, [clanId]);

    // Group by level
    const grouped = {};
    for (const memetic of memetics) {
      if (!grouped[memetic.level]) {
        grouped[memetic.level] = [];
      }
      grouped[memetic.level].push({
        id: memetic.id,
        characterId: memetic.char_id,
        userId: memetic.user_id,
        memeticName: memetic.memetic_name,
        memeticType: memetic.memetic_type,
        notes: memetic.notes,
        additionalNotes: memetic.additional_notes,
        username: memetic.username,
        characterName: memetic.gameCharacterName,
        gameCharacterName: memetic.gameCharacterName,
        obtainedAt: memetic.obtained_at
      });
    }

    res.json(grouped);
  } catch (error) {
    console.error('Get clan memetics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get memetics for a character
router.get('/my-memetics', async (req, res) => {
  try {
    const { characterId, level } = req.query;
    const userId = req.user.id;

    if (!characterId) {
      return res.status(400).json({ error: 'Character ID is required' });
    }

    // Check ownership
    const charCheck = await db.get(
      'SELECT * FROM characters WHERE id = ? AND user_id = ?',
      [characterId, userId]
    );

    if (!charCheck) {
      return res.status(404).json({ error: 'Character not found' });
    }

    let query = 'SELECT * FROM memetics WHERE character_id = ?';
    let params = [characterId];

    if (level) {
      query += ' AND level = ?';
      params.push(level);
    }

    query += ' ORDER BY level ASC, obtained_at DESC';

    const memetics = await db.query(query, params);

    res.json(memetics.map(m => ({
      id: m.id,
      characterId: m.character_id,
      clanId: m.clan_id,
      level: m.level,
      memeticName: m.memetic_name,
      memeticType: m.memetic_type,
      notes: m.notes,
      additionalNotes: m.additional_notes,
      clanName: '',
      obtainedAt: m.obtained_at
    })));
  } catch (error) {
    console.error('Get memetics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a new memetic
router.post('/', async (req, res) => {
  try {
    const { characterId, level, memeticName, memeticType, notes, additionalNotes } = req.body;
    const userId = req.user.id;

    if (!characterId || !level || !memeticName) {
      return res.status(400).json({ error: 'Character ID, level, and memetic name are required' });
    }

    // Check ownership
    const charCheck = await db.get(
      'SELECT * FROM characters WHERE id = ? AND user_id = ?',
      [characterId, userId]
    );

    if (!charCheck) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Get the clan_id from the character
    const clanId = charCheck.clan_id || null;

    const result = await db.run(
      `INSERT INTO memetics (character_id, clan_id, level, memetic_name, memetic_type, notes, additional_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [characterId, clanId, level, memeticName, memeticType || null, notes || null, additionalNotes || null]
    );

    const memetic = await db.get(
      'SELECT * FROM memetics WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      id: memetic.id,
      characterId: memetic.character_id,
      level: memetic.level,
      memeticName: memetic.memetic_name,
      memeticType: memetic.memetic_type,
      notes: memetic.notes,
      additionalNotes: memetic.additional_notes,
      obtainedAt: memetic.obtained_at
    });
  } catch (error) {
    console.error('Add memetic error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a memetic
router.put('/:memeticId', async (req, res) => {
  try {
    const { memeticId } = req.params;
    const { level, memeticName, memeticType, notes, additionalNotes } = req.body;
    const userId = req.user.id;

    // Check ownership through character
    const memetic = await db.get(
      `SELECT m.*, c.user_id
       FROM memetics m
       JOIN characters c ON m.character_id = c.id
       WHERE m.id = ? AND c.user_id = ?`,
      [memeticId, userId]
    );

    if (!memetic) {
      return res.status(404).json({ error: 'Memetic not found' });
    }

    await db.run(
      `UPDATE memetics
       SET level = COALESCE(?, level),
           memetic_name = COALESCE(?, memetic_name),
           memetic_type = ?,
           notes = ?,
           additional_notes = ?
       WHERE id = ?`,
      [level, memeticName, memeticType, notes, additionalNotes, memeticId]
    );

    const updated = await db.get(
      'SELECT * FROM memetics WHERE id = ?',
      [memeticId]
    );

    res.json({
      id: updated.id,
      characterId: updated.character_id,
      level: updated.level,
      memeticName: updated.memetic_name,
      memeticType: updated.memetic_type,
      notes: updated.notes,
      additionalNotes: updated.additional_notes,
      obtainedAt: updated.obtained_at
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

    // Check ownership through character
    const memetic = await db.get(
      `SELECT m.*, c.user_id
       FROM memetics m
       JOIN characters c ON m.character_id = c.id
       WHERE m.id = ? AND c.user_id = ?`,
      [memeticId, userId]
    );

    if (!memetic) {
      return res.status(404).json({ error: 'Memetic not found' });
    }

    await db.run('DELETE FROM memetics WHERE id = ?', [memeticId]);

    res.json({ message: 'Memetic deleted successfully' });
  } catch (error) {
    console.error('Delete memetic error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
