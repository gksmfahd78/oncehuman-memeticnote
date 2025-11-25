/**
 * Check if user is banned middleware
 * Should be used after authMiddleware
 */

const db = require('../config/db');

const checkBan = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    // Fetch full user data from database to check ban status
    const user = await db.get(
      `SELECT is_banned, ban_until, ban_reason, banned_at, banned_by
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(401).json({ error: '사용자를 찾을 수 없습니다' });
    }

    // Check if user is banned
    if (user.is_banned) {
      // Check if ban is temporary and has expired
      if (user.ban_until) {
        const banUntil = new Date(user.ban_until);
        const now = new Date();

        if (now > banUntil) {
          // Ban has expired, unban the user
          await db.run(
            `UPDATE users
             SET is_banned = 0, ban_until = NULL, ban_reason = NULL
             WHERE id = ?`,
            [req.user.id]
          );
          return next();
        } else {
          // Ban is still active
          const daysRemaining = Math.ceil((banUntil - now) / (1000 * 60 * 60 * 24));
          return res.status(403).json({
            error: '계정이 일시 정지되었습니다',
            banned: true,
            ban_reason: user.ban_reason || '관리자에 의해 정지됨',
            ban_until: user.ban_until,
            days_remaining: daysRemaining
          });
        }
      } else {
        // Permanent ban
        return res.status(403).json({
          error: '계정이 영구 차단되었습니다',
          banned: true,
          permanent: true,
          ban_reason: user.ban_reason || '관리자에 의해 차단됨'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Check ban error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

module.exports = checkBan;
