const passport = require('passport');
const DiscordStrategy = require('@oauth-everything/passport-discord').Strategy;
const db = require('./db');
require('dotenv').config();

// Generate unique UID
const generateUniqueUid = async () => {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let uid;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    uid = '';
    for (let i = 0; i < 8; i++) {
      uid += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const existingUid = await db.get('SELECT id FROM users WHERE uid = ?', [uid]);
    if (!existingUid) {
      return uid;
    }
    attempts++;
  }

  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
};

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Validate OAuth config (only log in development)
if (process.env.NODE_ENV === 'development') {
  console.log('Discord OAuth Config:', {
    clientID: process.env.DISCORD_CLIENT_ID ? 'Set' : 'Missing',
    clientSecret: process.env.DISCORD_CLIENT_SECRET ? 'Set' : 'Missing',
    callbackURL: process.env.DISCORD_CALLBACK_URL
  });
}

passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL: process.env.DISCORD_CALLBACK_URL,
      scope: ['identify', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Removed sensitive profile logging for security

        // Extract avatar hash from profile (it's in _json, not directly on profile)
        const avatarHash = profile._json?.avatar || profile.avatar;

        // Calculate Discord account creation date from Discord ID (Snowflake)
        // Discord Snowflake epoch starts at 2015-01-01T00:00:00.000Z
        const DISCORD_EPOCH = 1420070400000;
        const discordIdBigInt = BigInt(profile.id);
        const timestamp = Number(discordIdBigInt >> 22n) + DISCORD_EPOCH;
        const discordCreatedAt = new Date(timestamp).toISOString();

        // Check if user already exists with this Discord ID
        let user = await db.get(
          'SELECT * FROM users WHERE discord_id = ?',
          [profile.id]
        );

        if (user) {
          // Update existing user's Discord info
          // Discord avatar URL construction
          const avatarUrl = avatarHash
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${avatarHash}.${
                avatarHash.startsWith('a_') ? 'gif' : 'png'
              }`
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(profile.id) % 5}.png`;

          // Update user avatar (removed sensitive logging)

          const displayName = profile._json?.global_name || profile.global_name || profile.username;

          await db.run(
            `UPDATE users
             SET username = ?, discord_username = ?, discord_avatar = ?, discord_created_at = ?
             WHERE id = ?`,
            [displayName, profile.username, avatarUrl, discordCreatedAt, user.id]
          );

          user = await db.get('SELECT * FROM users WHERE id = ?', [user.id]);
          return done(null, user);
        }

        // Create new user
        const uid = await generateUniqueUid();
        const username = profile._json?.global_name || profile.global_name || profile.username;
        const email = profile.email || `${profile.id}@discord.user`;

        // Discord avatar URL construction (using _json.avatar)
        const avatarUrl = avatarHash
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${avatarHash}.${
              avatarHash.startsWith('a_') ? 'gif' : 'png'
            }`
          : `https://cdn.discordapp.com/embed/avatars/${parseInt(profile.id) % 5}.png`;

        // Creating new user from Discord OAuth

        const result = await db.run(
          `INSERT INTO users (uid, username, email, discord_id, discord_username, discord_avatar, discord_created_at, password_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [uid, username, email, profile.id, profile.username, avatarUrl, discordCreatedAt, 'discord_oauth']
        );

        user = await db.get('SELECT * FROM users WHERE id = ?', [result.id]);
        done(null, user);
      } catch (error) {
        console.error('Discord OAuth error:', error);
        done(error, null);
      }
    }
  )
);

module.exports = passport;
