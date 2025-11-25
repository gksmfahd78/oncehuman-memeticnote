const db = require('./config/db');
require('dotenv').config();

async function updateAllDiscordAvatars() {
  try {
    console.log('Fetching all Discord users...');

    // Get all users with Discord ID but no avatar
    const users = await db.query(
      'SELECT id, discord_id, discord_username FROM users WHERE discord_id IS NOT NULL'
    );

    console.log(`Found ${users.length} Discord users`);

    for (const user of users) {
      // Generate default Discord avatar URL
      const avatarUrl = `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discord_id) % 5}.png`;

      console.log(`Updating user ${user.discord_username || user.id} (ID: ${user.discord_id})`);
      console.log(`  Avatar URL: ${avatarUrl}`);

      await db.run(
        'UPDATE users SET discord_avatar = ? WHERE id = ?',
        [avatarUrl, user.id]
      );
    }

    console.log('\n✅ Updated all Discord user avatars with default avatars');
    console.log('\nNote: Users will get their real avatars when they login again.');
    console.log('The default avatars are based on their Discord ID.');

    // Show updated users
    const updated = await db.query(
      'SELECT id, username, discord_id, discord_avatar FROM users WHERE discord_id IS NOT NULL'
    );

    console.log('\n=== Updated Users ===');
    updated.forEach(u => {
      console.log(`${u.username}: ${u.discord_avatar}`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }

  process.exit(0);
}

updateAllDiscordAvatars();
