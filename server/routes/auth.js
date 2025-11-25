const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const passport = require('../config/passport');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'profiles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Image magic bytes for validation
const IMAGE_MAGIC_BYTES = {
  jpg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  gif: [0x47, 0x49, 0x46],
  webp: [0x52, 0x49, 0x46, 0x46]
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file at a time
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다 (jpg, png, gif, webp)'));
    }
  }
});

// Function to generate unique UID
const generateUniqueUid = async () => {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let uid;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    // Generate random 8-character UID
    uid = '';
    for (let i = 0; i < 8; i++) {
      uid += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Check if UID already exists
    const existingUid = await db.get('SELECT id FROM users WHERE uid = ?', [uid]);
    if (!existingUid) {
      return uid;
    }
    attempts++;
  }

  // If random generation fails, use timestamp-based UID
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
};

// Email validation function
const isValidEmail = (email) => {
  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(email)) {
    return false;
  }

  // Check for valid domain (must have at least one dot and valid TLD)
  const parts = email.split('@');
  if (parts.length !== 2) {
    return false;
  }

  const domain = parts[1];
  const domainParts = domain.split('.');

  // Must have at least domain and TLD (e.g., example.com)
  if (domainParts.length < 2) {
    return false;
  }

  // TLD must be at least 2 characters
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) {
    return false;
  }

  // Each domain part should not be empty
  for (const part of domainParts) {
    if (part.length === 0) {
      return false;
    }
  }

  return true;
};

// Discord OAuth Routes
router.get('/discord', passport.authenticate('discord'));

router.get('/discord/callback',
  passport.authenticate('discord', { session: false, failureRedirect: '/login' }),
  async (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign(
        {
          id: req.user.id,
          uid: req.user.uid,
          username: req.user.username,
          email: req.user.email,
          discord_id: req.user.discord_id
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Discord callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/login?error=discord_auth_failed`);
    }
  }
);

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: '모든 필수 항목을 입력해주세요' });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: '올바른 이메일 형식이 아닙니다 (예: user@example.com)' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: '비밀번호는 최소 6자 이상이어야 합니다' });
    }

    // Validate username length
    if (username.length < 2 || username.length > 50) {
      return res.status(400).json({ error: '사용자 이름은 2자 이상 50자 이하여야 합니다' });
    }

    // Check if user already exists
    const existingUser = await db.get(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUser) {
      return res.status(400).json({ error: '이미 사용 중인 이메일입니다' });
    }

    // Generate unique UID
    const uid = await generateUniqueUid();

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const result = await db.run(
      'INSERT INTO users (uid, username, email, password_hash) VALUES (?, ?, ?, ?)',
      [uid, username, email, passwordHash]
    );

    // Get the inserted user
    const user = await db.get(
      'SELECT id, uid, username, email, created_at FROM users WHERE id = ?',
      [result.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        uid: user.uid,
        username: user.username,
        email: user.email,
        discord_id: user.discord_id || null
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        uid: user.uid,
        username: user.username,
        email: user.email,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '회원가입 중 서버 오류가 발생했습니다' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요' });
    }

    // Find user
    const user = await db.get(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        uid: user.uid,
        username: user.username,
        email: user.email,
        discord_id: user.discord_id || null
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        uid: user.uid,
        username: user.username,
        email: user.email,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '로그인 중 서버 오류가 발생했습니다' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, uid, username, email, bio, profile_image, discord_avatar, discord_id, discord_created_at, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    // Use Discord avatar if no custom profile image
    const profileImage = user.profile_image || user.discord_avatar;

    // Check if user is admin
    const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean).map(id => id.trim());
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean).map(email => email.trim());

    const isAdmin = adminIds.includes(user.id.toString()) ||
                    (user.discord_id && adminIds.includes(user.discord_id.toString())) ||
                    (user.email && adminEmails.includes(user.email));

    res.json({
      id: user.id,
      uid: user.uid,
      username: user.username,
      email: user.email,
      bio: user.bio,
      profileImage: profileImage,
      discordId: user.discord_id,
      discordCreatedAt: user.discord_created_at,
      createdAt: user.created_at,
      isAdmin: isAdmin
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// Upload profile image
router.post('/upload-profile-image', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '이미지 파일이 필요합니다' });
    }

    // Validate file content by reading magic bytes
    const buffer = fs.readFileSync(req.file.path);
    const isValidImage = Object.values(IMAGE_MAGIC_BYTES).some(magic => {
      return magic.every((byte, index) => buffer[index] === byte);
    });

    if (!isValidImage) {
      // Delete invalid file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '유효하지 않은 이미지 파일입니다' });
    }

    // Generate URL for the uploaded image
    const imageUrl = `/uploads/profiles/${req.file.filename}`;

    // Delete old profile image if exists
    const user = await db.get(
      'SELECT profile_image FROM users WHERE id = ?',
      [req.user.id]
    );

    if (user.profile_image) {
      const oldImagePath = path.join(__dirname, '..', user.profile_image.replace('/uploads/', 'uploads/'));
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Update user's profile image
    await db.run(
      'UPDATE users SET profile_image = ? WHERE id = ?',
      [imageUrl, req.user.id]
    );

    res.json({
      profileImage: imageUrl,
      message: '프로필 이미지가 업데이트되었습니다'
    });
  } catch (error) {
    console.error('Upload profile image error:', error);
    // Delete uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: '이미지 업로드 중 서버 오류가 발생했습니다' });
  }
});

// Get public user profile by UID (no auth required)
router.get('/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    // Get user basic info
    const user = await db.get(
      'SELECT id, uid, username, bio, profile_image, discord_avatar, discord_created_at, created_at FROM users WHERE uid = ?',
      [uid]
    );

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    // Get review statistics
    const reviewStats = await db.get(
      `SELECT
        COUNT(*) as total_reviews,
        SUM(CASE WHEN rating = 'positive' THEN 1 ELSE 0 END) as positive_reviews,
        SUM(CASE WHEN rating = 'neutral' THEN 1 ELSE 0 END) as neutral_reviews,
        SUM(CASE WHEN rating = 'negative' THEN 1 ELSE 0 END) as negative_reviews
      FROM reviews
      WHERE reviewed_user_id = ?`,
      [user.id]
    );

    // Get recent trades (last 5)
    const recentTrades = await db.query(
      `SELECT id, title, item_name, price, status, created_at
       FROM trades
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 5`,
      [user.id]
    );

    // Use Discord avatar if no custom profile image
    const profileImage = user.profile_image || user.discord_avatar;

    // Calculate trust score (same as in profile)
    const totalReviews = reviewStats.total_reviews || 0;
    const positiveReviews = reviewStats.positive_reviews || 0;
    const negativeReviews = reviewStats.negative_reviews || 0;

    let trustScore = 36.5;
    if (totalReviews > 0) {
      const positiveWeight = 1.0;
      const negativeWeight = -2.0;
      const score = (positiveReviews * positiveWeight + negativeReviews * negativeWeight);
      trustScore = Math.max(0, Math.min(100, 36.5 + score));
    }

    res.json({
      id: user.id,
      uid: user.uid,
      username: user.username,
      bio: user.bio,
      profileImage: profileImage,
      discordCreatedAt: user.discord_created_at,
      createdAt: user.created_at,
      trustScore: parseFloat(trustScore.toFixed(1)),
      reviews: {
        total: totalReviews,
        positive: positiveReviews,
        neutral: reviewStats.neutral_reviews || 0,
        negative: negativeReviews
      },
      recentTrades: recentTrades
    });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { username, bio, profileImage: newProfileImage } = req.body;
    const userId = req.user.id;

    // Validate input
    if (username && username.trim().length === 0) {
      return res.status(400).json({ error: '사용자 이름은 비워둘 수 없습니다' });
    }

    // Check if username is already taken by another user
    if (username) {
      const existingUser = await db.get(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username, userId]
      );

      if (existingUser) {
        return res.status(400).json({ error: '이미 사용 중인 사용자 이름입니다' });
      }
    }

    // If profileImage is explicitly set to null, delete the old image
    if (newProfileImage === null) {
      const currentUser = await db.get(
        'SELECT profile_image FROM users WHERE id = ?',
        [userId]
      );

      if (currentUser.profile_image) {
        const oldImagePath = path.join(__dirname, '..', currentUser.profile_image.replace('/uploads/', 'uploads/'));
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (username !== undefined) {
      updates.push('username = ?');
      params.push(username);
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      params.push(bio);
    }
    if (newProfileImage !== undefined) {
      updates.push('profile_image = ?');
      params.push(newProfileImage);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '업데이트할 항목이 없습니다' });
    }

    params.push(userId);

    await db.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Get updated user
    const user = await db.get(
      'SELECT id, uid, username, email, bio, profile_image, discord_avatar, discord_created_at, created_at FROM users WHERE id = ?',
      [userId]
    );

    // Use Discord avatar if no custom profile image
    const profileImage = user.profile_image || user.discord_avatar;

    res.json({
      id: user.id,
      uid: user.uid,
      username: user.username,
      email: user.email,
      bio: user.bio,
      profileImage: profileImage,
      discordCreatedAt: user.discord_created_at,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: '프로필 업데이트 중 서버 오류가 발생했습니다' });
  }
});

module.exports = router;
