const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const checkBan = require('../middleware/checkBan');
const adminMiddleware = require('../middleware/adminAuth');

const router = express.Router();

// Get all squad recruitments (public)
router.get('/', async (req, res) => {
  try {
    const { status, squad_type, server_name, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let countQuery = `
      SELECT COUNT(*) as total
      FROM squad_recruitments sr
      WHERE 1=1
    `;
    let query = `
      SELECT
        sr.*,
        u.id as recruiter_id,
        u.uid as recruiter_uid,
        u.username as recruiter_username,
        u.discord_avatar as recruiter_discord_avatar
      FROM squad_recruitments sr
      JOIN users u ON sr.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND sr.status = ?';
      countQuery += ' AND sr.status = ?';
      params.push(status);
    }

    if (squad_type) {
      query += ' AND sr.squad_type = ?';
      countQuery += ' AND sr.squad_type = ?';
      params.push(squad_type);
    }

    if (server_name) {
      query += ' AND sr.server_name LIKE ?';
      countQuery += ' AND sr.server_name LIKE ?';
      params.push(`%${server_name}%`);
    }

    // Get total count
    const countResult = await db.get(countQuery, params);
    const total = countResult.total;

    query += ' ORDER BY sr.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const recruitments = await db.query(query, params);

    res.json({
      recruitments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get squad recruitments error:', error);
    res.status(500).json({ error: '스쿼드 모집 목록 조회 중 오류가 발생했습니다' });
  }
});

// Get single squad recruitment by ID
router.get('/:id', async (req, res) => {
  try {
    const recruitment = await db.get(`
      SELECT
        sr.*,
        u.id as recruiter_id,
        u.uid as recruiter_uid,
        u.username as recruiter_username,
        u.discord_avatar as recruiter_discord_avatar,
        u.discord_created_at as recruiter_discord_created_at
      FROM squad_recruitments sr
      JOIN users u ON sr.user_id = u.id
      WHERE sr.id = ?
    `, [req.params.id]);

    if (!recruitment) {
      return res.status(404).json({ error: '스쿼드 모집을 찾을 수 없습니다' });
    }

    res.json(recruitment);
  } catch (error) {
    console.error('Get squad recruitment error:', error);
    res.status(500).json({ error: '스쿼드 모집 조회 중 오류가 발생했습니다' });
  }
});

// Create new squad recruitment (protected)
router.post('/', authMiddleware, checkBan, async (req, res) => {
  try {
    const {
      title,
      description,
      server_name,
      squad_type,
      required_members,
      requirements
    } = req.body;

    // Validation
    if (!title || !description || !server_name || !squad_type || !required_members) {
      return res.status(400).json({ error: '필수 항목을 모두 입력해주세요' });
    }

    if (required_members < 2 || required_members > 50) {
      return res.status(400).json({ error: '모집 인원은 2명에서 50명 사이여야 합니다' });
    }

    const validSquadTypes = ['pvp', 'pve', 'mixed'];
    if (!validSquadTypes.includes(squad_type)) {
      return res.status(400).json({ error: '올바른 스쿼드 유형을 선택해주세요' });
    }

    const result = await db.run(`
      INSERT INTO squad_recruitments (
        user_id, title, description, server_name, squad_type,
        required_members, requirements, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '+9 hours'), datetime('now', '+9 hours'))
    `, [req.user.id, title, description, server_name, squad_type, required_members, requirements || null]);

    const recruitment = await db.get(`
      SELECT
        sr.*,
        u.id as recruiter_id,
        u.uid as recruiter_uid,
        u.username as recruiter_username,
        u.discord_avatar as recruiter_discord_avatar
      FROM squad_recruitments sr
      JOIN users u ON sr.user_id = u.id
      WHERE sr.id = ?
    `, [result.id]);

    res.status(201).json(recruitment);
  } catch (error) {
    console.error('Create squad recruitment error:', error);
    res.status(500).json({ error: '스쿼드 모집 생성 중 오류가 발생했습니다' });
  }
});

// Update squad recruitment (protected)
router.put('/:id', authMiddleware, checkBan, async (req, res) => {
  try {
    const { title, description, server_name, squad_type, required_members, requirements, status } = req.body;

    // Check if recruitment exists and user is the owner
    const recruitment = await db.get(
      'SELECT * FROM squad_recruitments WHERE id = ?',
      [req.params.id]
    );

    if (!recruitment) {
      return res.status(404).json({ error: '스쿼드 모집을 찾을 수 없습니다' });
    }

    if (recruitment.user_id !== req.user.id) {
      return res.status(403).json({ error: '본인이 작성한 모집글만 수정할 수 있습니다' });
    }

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
    if (server_name !== undefined) {
      updates.push('server_name = ?');
      params.push(server_name);
    }
    if (squad_type !== undefined) {
      const validSquadTypes = ['pvp', 'pve', 'mixed'];
      if (!validSquadTypes.includes(squad_type)) {
        return res.status(400).json({ error: '올바른 스쿼드 유형을 선택해주세요' });
      }
      updates.push('squad_type = ?');
      params.push(squad_type);
    }
    if (required_members !== undefined) {
      if (required_members < 2 || required_members > 50) {
        return res.status(400).json({ error: '모집 인원은 2명에서 50명 사이여야 합니다' });
      }
      updates.push('required_members = ?');
      params.push(required_members);
    }
    if (requirements !== undefined) {
      updates.push('requirements = ?');
      params.push(requirements);
    }
    if (status !== undefined) {
      const validStatuses = ['recruiting', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: '올바른 상태를 선택해주세요' });
      }
      updates.push('status = ?');
      params.push(status);
    }

    updates.push("updated_at = datetime('now', '+9 hours')");

    if (updates.length === 1) {
      return res.status(400).json({ error: '업데이트할 항목이 없습니다' });
    }

    params.push(req.params.id);

    await db.run(
      `UPDATE squad_recruitments SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updatedRecruitment = await db.get(`
      SELECT
        sr.*,
        u.id as recruiter_id,
        u.uid as recruiter_uid,
        u.username as recruiter_username,
        u.discord_avatar as recruiter_discord_avatar
      FROM squad_recruitments sr
      JOIN users u ON sr.user_id = u.id
      WHERE sr.id = ?
    `, [req.params.id]);

    res.json(updatedRecruitment);
  } catch (error) {
    console.error('Update squad recruitment error:', error);
    res.status(500).json({ error: '스쿼드 모집 수정 중 오류가 발생했습니다' });
  }
});

// Delete squad recruitment (protected)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const recruitment = await db.get(
      'SELECT * FROM squad_recruitments WHERE id = ?',
      [req.params.id]
    );

    if (!recruitment) {
      return res.status(404).json({ error: '스쿼드 모집을 찾을 수 없습니다' });
    }

    if (recruitment.user_id !== req.user.id) {
      return res.status(403).json({ error: '본인이 작성한 모집글만 삭제할 수 있습니다' });
    }

    await db.run('DELETE FROM squad_recruitments WHERE id = ?', [req.params.id]);

    res.json({ message: '스쿼드 모집이 삭제되었습니다' });
  } catch (error) {
    console.error('Delete squad recruitment error:', error);
    res.status(500).json({ error: '스쿼드 모집 삭제 중 오류가 발생했습니다' });
  }
});

// ==================== ADMIN ROUTES ====================

// Get all squad recruitments for admin (with search and filters)
router.get('/admin/squads', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let countQuery = `
      SELECT COUNT(*) as total
      FROM squad_recruitments sr
      JOIN users u ON sr.user_id = u.id
      WHERE 1=1
    `;
    let query = `
      SELECT
        sr.*,
        u.id as recruiter_id,
        u.uid as recruiter_uid,
        u.username as recruiter_username,
        u.discord_avatar as recruiter_discord_avatar
      FROM squad_recruitments sr
      JOIN users u ON sr.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND sr.status = ?';
      countQuery += ' AND sr.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (sr.title LIKE ? OR sr.description LIKE ? OR u.username LIKE ?)';
      countQuery += ' AND (sr.title LIKE ? OR sr.description LIKE ? OR u.username LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Get total count
    const countResult = await db.get(countQuery, params);
    const total = countResult.total;

    query += ' ORDER BY sr.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const squads = await db.query(query, params);

    res.json({
      squads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get squads error:', error);
    res.status(500).json({ error: '스쿼드 모집 목록 조회 중 오류가 발생했습니다' });
  }
});

// Delete squad recruitment (admin)
router.delete('/admin/squads/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: '삭제 사유를 입력해주세요' });
    }

    const recruitment = await db.get(
      'SELECT * FROM squad_recruitments WHERE id = ?',
      [req.params.id]
    );

    if (!recruitment) {
      return res.status(404).json({ error: '스쿼드 모집을 찾을 수 없습니다' });
    }

    await db.run('DELETE FROM squad_recruitments WHERE id = ?', [req.params.id]);

    console.log(`[ADMIN] Squad recruitment #${req.params.id} deleted by admin #${req.user.id}. Reason: ${reason}`);

    res.json({ message: '스쿼드 모집이 삭제되었습니다' });
  } catch (error) {
    console.error('Admin delete squad error:', error);
    res.status(500).json({ error: '스쿼드 모집 삭제 중 오류가 발생했습니다' });
  }
});

module.exports = router;
