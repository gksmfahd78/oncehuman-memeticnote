/**
 * Admin authentication middleware
 * Checks if the user has admin privileges
 */

const adminAuth = async (req, res, next) => {
  try {
    // req.user is already set by the auth middleware
    if (!req.user) {
      console.error('[ADMIN AUTH] No user found in request');
      return res.status(401).json({ error: '인증이 필요합니다' });
    }

    // 🔒 보안: 민감한 정보 로깅 제거 (production에서는 로그 최소화)

    // Check if user is admin
    // Admin IDs can be either database user IDs or Discord IDs
    const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean).map(id => id.trim());

    // Admin emails
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean).map(email => email.trim());

    // Check by database ID
    const isAdminByDbId = adminIds.includes(req.user.id.toString());

    // Check by Discord ID (if user has one)
    const isAdminByDiscordId = req.user.discord_id && adminIds.includes(req.user.discord_id.toString());

    // Check by email
    const isAdminByEmail = req.user.email && adminEmails.includes(req.user.email);

    if (!isAdminByDbId && !isAdminByDiscordId && !isAdminByEmail) {
      // 보안: 권한 없음만 기록 (사용자 정보는 기록하지 않음)
      return res.status(403).json({ error: '관리자 권한이 필요합니다' });
    }

    next();
  } catch (error) {
    // 🔒 보안: 에러 스택 추적은 개발 환경에서만 출력
    if (process.env.NODE_ENV === 'development') {
      console.error('[ADMIN AUTH] Error:', error);
    }
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

module.exports = adminAuth;
