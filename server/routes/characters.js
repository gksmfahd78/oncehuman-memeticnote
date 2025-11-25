const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get user's characters
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const characters = await db.query(
      'SELECT * FROM characters WHERE user_id = ? ORDER BY created_at ASC',
      [userId]
    );

    res.json(characters.map(char => ({
      id: char.id,
      name: char.character_name,
      profession: char.profession,
      note: char.note,
      clanId: char.clan_id,
      createdAt: char.created_at
    })));
  } catch (error) {
    console.error('Get characters error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new character
router.post('/', async (req, res) => {
  try {
    const { name, profession, note, clanId } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: 'Character name is required' });
    }

    // Validate profession if provided
    if (profession && !['정원사', '조련사', '요리사'].includes(profession)) {
      return res.status(400).json({ error: '올바른 직업을 선택해주세요' });
    }

    // If clanId is provided, verify user is a member of that clan
    if (clanId) {
      const membership = await db.get(
        'SELECT * FROM clan_members WHERE clan_id = ? AND user_id = ?',
        [clanId, userId]
      );

      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this clan' });
      }
    }

    const result = await db.run(
      'INSERT INTO characters (user_id, character_name, profession, note, clan_id) VALUES (?, ?, ?, ?, ?)',
      [userId, name, profession || null, note || null, clanId || null]
    );

    const character = await db.get(
      'SELECT * FROM characters WHERE id = ?',
      [result.id]
    );

    // If clan is selected, add to clan_members if not already added
    if (clanId) {
      const existingMembership = await db.get(
        'SELECT * FROM clan_members WHERE clan_id = ? AND character_id = ?',
        [clanId, character.id]
      );

      if (!existingMembership) {
        await db.run(
          'INSERT INTO clan_members (clan_id, character_id, user_id, role) VALUES (?, ?, ?, ?)',
          [clanId, character.id, userId, 'member']
        );
      }
    }

    res.status(201).json({
      id: character.id,
      name: character.character_name,
      profession: character.profession,
      note: character.note,
      clanId: character.clan_id,
      createdAt: character.created_at
    });
  } catch (error) {
    console.error('Create character error:', error);
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: '이미 이 이름을 가진 캐릭터가 있습니다' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update character
router.put('/:characterId', async (req, res) => {
  try {
    const { characterId } = req.params;
    const { name, profession, note, clanId } = req.body;
    const userId = req.user.id;

    // Validate profession if provided
    if (profession && !['정원사', '조련사', '요리사'].includes(profession)) {
      return res.status(400).json({ error: '올바른 직업을 선택해주세요' });
    }

    // Check ownership
    const charCheck = await db.get(
      'SELECT * FROM characters WHERE id = ? AND user_id = ?',
      [characterId, userId]
    );

    if (!charCheck) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const oldClanId = charCheck.clan_id;

    // If clanId is changing and new clanId is provided, verify membership
    if (clanId && clanId !== oldClanId) {
      const membership = await db.get(
        'SELECT * FROM clan_members WHERE clan_id = ? AND user_id = ?',
        [clanId, userId]
      );

      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this clan' });
      }
    }

    await db.run(
      `UPDATE characters
       SET character_name = COALESCE(?, character_name),
           profession = ?,
           note = ?,
           clan_id = ?
       WHERE id = ? AND user_id = ?`,
      [name, profession, note, clanId, characterId, userId]
    );

    // Handle clan membership changes
    if (clanId !== oldClanId) {
      // Remove from old clan if it was in one
      if (oldClanId) {
        await db.run(
          'DELETE FROM clan_members WHERE clan_id = ? AND character_id = ?',
          [oldClanId, characterId]
        );
      }

      // Add to new clan if one is selected
      if (clanId) {
        const existingMembership = await db.get(
          'SELECT * FROM clan_members WHERE clan_id = ? AND character_id = ?',
          [clanId, characterId]
        );

        if (!existingMembership) {
          await db.run(
            'INSERT INTO clan_members (clan_id, character_id, user_id, role) VALUES (?, ?, ?, ?)',
            [clanId, characterId, userId, 'member']
          );
        }
      }

      // Update memetics clan_id
      await db.run(
        'UPDATE memetics SET clan_id = ? WHERE character_id = ?',
        [clanId, characterId]
      );
    }

    const character = await db.get(
      'SELECT * FROM characters WHERE id = ?',
      [characterId]
    );

    res.json({
      id: character.id,
      name: character.character_name,
      profession: character.profession,
      note: character.note,
      clanId: character.clan_id,
      createdAt: character.created_at
    });
  } catch (error) {
    console.error('Update character error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset character memetics
router.post('/:characterId/reset', async (req, res) => {
  try {
    const { characterId } = req.params;
    const { resetType } = req.body;
    const userId = req.user.id;

    // Check ownership
    const charCheck = await db.get(
      'SELECT * FROM characters WHERE id = ? AND user_id = ?',
      [characterId, userId]
    );

    if (!charCheck) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (resetType === 'partial') {
      // Delete memetics level 40 and below
      await db.run(
        'DELETE FROM memetics WHERE character_id = ? AND level <= 40',
        [characterId]
      );
    } else {
      // Delete all memetics
      await db.run(
        'DELETE FROM memetics WHERE character_id = ?',
        [characterId]
      );
    }

    res.json({ message: 'Character reset successfully' });
  } catch (error) {
    console.error('Reset character error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete character
router.delete('/:characterId', async (req, res) => {
  try {
    const { characterId } = req.params;
    const userId = req.user.id;

    // Check ownership first
    const character = await db.get(
      'SELECT * FROM characters WHERE id = ? AND user_id = ?',
      [characterId, userId]
    );

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Delete from clan_members first (if in any clan)
    await db.run(
      'DELETE FROM clan_members WHERE character_id = ?',
      [characterId]
    );

    // Delete character (this will cascade delete memetics)
    await db.run(
      'DELETE FROM characters WHERE id = ? AND user_id = ?',
      [characterId, userId]
    );

    res.json({ message: 'Character deleted successfully' });
  } catch (error) {
    console.error('Delete character error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
