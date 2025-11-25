const db = require('./config/db');

async function testProfile() {
  // 사용자 정보 조회
  const user = await db.get(
    'SELECT id, uid, username, email, bio, profile_image, discord_avatar, created_at FROM users WHERE discord_id = ?',
    ['374497302452371456']
  );

  console.log('\n=== Database User ===');
  console.log(JSON.stringify(user, null, 2));

  // /api/auth/me 엔드포인트와 동일한 로직
  const profileImage = user.profile_image || user.discord_avatar;

  console.log('\n=== API Response (what /api/auth/me returns) ===');
  console.log(JSON.stringify({
    id: user.id,
    uid: user.uid,
    username: user.username,
    email: user.email,
    bio: user.bio,
    profileImage: profileImage,
    createdAt: user.created_at
  }, null, 2));

  console.log('\n=== Image URLs ===');
  console.log('profile_image:', user.profile_image);
  console.log('discord_avatar:', user.discord_avatar);
  console.log('profileImage (final):', profileImage);

  process.exit(0);
}

testProfile().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
