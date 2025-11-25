const db = require('./config/db');

async function updateDiscordAvatar() {
  const user = await db.get('SELECT * FROM users WHERE discord_id = ?', ['374497302452371456']);

  if (!user || !user.discord_id) {
    console.log('User not found or no Discord ID');
    return;
  }

  console.log('Current user:', {
    id: user.id,
    username: user.username,
    discord_id: user.discord_id,
    discord_avatar: user.discord_avatar
  });

  // Discord 기본 아바타 URL 생성
  const discriminator = parseInt(user.discord_id) % 5;
  const defaultAvatar = `https://cdn.discordapp.com/embed/avatars/${discriminator}.png`;

  console.log('Setting default avatar URL:', defaultAvatar);

  await db.run(
    'UPDATE users SET discord_avatar = ? WHERE id = ?',
    [defaultAvatar, user.id]
  );

  console.log('Updated discord_avatar for user:', user.username);

  const updated = await db.get('SELECT discord_avatar FROM users WHERE id = ?', [user.id]);
  console.log('New discord_avatar:', updated.discord_avatar);

  process.exit(0);
}

updateDiscordAvatar().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
