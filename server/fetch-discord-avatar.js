const https = require('https');
const db = require('./config/db');
require('dotenv').config();

async function fetchDiscordAvatar() {
  const discordId = '374497302452371456';

  const options = {
    hostname: 'discord.com',
    path: `/api/v10/users/${discordId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_CLIENT_SECRET}`,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Discord API returned ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function updateUserAvatar() {
  try {
    console.log('Fetching Discord user data...');
    const discordUser = await fetchDiscordAvatar();

    console.log('\n=== Discord User Data ===');
    console.log(JSON.stringify(discordUser, null, 2));

    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.${
          discordUser.avatar.startsWith('a_') ? 'gif' : 'png'
        }`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.id) % 5}.png`;

    console.log('\n=== Avatar URL ===');
    console.log(avatarUrl);

    await db.run(
      'UPDATE users SET discord_avatar = ?, discord_username = ? WHERE discord_id = ?',
      [avatarUrl, discordUser.username, discordUser.id]
    );

    console.log('\n✅ Updated user avatar in database');

    const updated = await db.get('SELECT discord_avatar FROM users WHERE discord_id = ?', [discordUser.id]);
    console.log('New discord_avatar:', updated.discord_avatar);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nNote: This requires a Discord Bot Token or the user needs to re-login.');
    console.log('To get the real avatar, please logout and login again.');
  }

  process.exit(0);
}

updateUserAvatar();
