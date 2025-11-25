const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.discord_id || !decoded.email) {
      const user = await db.get(
        'SELECT id, uid, username, email, discord_id FROM users WHERE id = ?',
        [decoded.id]
      );

      if (user) {
        req.user = {
          ...decoded,
          email: user.email,
          discord_id: user.discord_id
        };
      } else {
        req.user = decoded;
      }
    } else {
      req.user = decoded;
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
