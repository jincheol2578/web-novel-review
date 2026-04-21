'use strict';

module.exports = async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: '인증이 필요합니다.' });

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey,
      },
    });

    const data = await response.json();

    if (!response.ok || !data.id) {
      return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    }

    req.userId = data.id;
    req.userEmail = data.email;
    next();
  } catch (err) {
    console.error('[AUTH_MIDDLEWARE]', err.message);
    return res.status(401).json({ error: '인증 확인 실패' });
  }
};
