import { getSupabaseClient } from '../utils/supabaseClient.js';
import { getFirebaseAdminApp } from '../utils/firebaseAdmin.js';

const normalizeUser = (user, provider = 'supabase') => ({
  id: user.id,
  email: user.email,
  provider,
  role: user.role || user.app_metadata?.role || 'user',
  metadata: user.user_metadata || user.app_metadata || {},
});

export const loginHandler = async (req, res) => {
  const { email, password, provider = 'supabase' } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    if (provider === 'firebase') {
      const firebaseAdmin = await getFirebaseAdminApp();
      if (!firebaseAdmin) {
        return res.status(500).json({ error: 'Firebase admin SDK is not configured' });
      }

      const { users } = await firebaseAdmin.auth().getUsers([{ email }]);
      if (!users?.length) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      return res.status(200).json({
        user: normalizeUser(users[0], 'firebase'),
        provider: 'firebase',
      });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data?.session) {
      return res.status(401).json({ error: error?.message || 'Invalid login credentials' });
    }

    res.setHeader('Set-Cookie', `accelrfx-session=${data.session.access_token}; Path=/; HttpOnly; SameSite=Strict`);

    return res.status(200).json({
      user: normalizeUser(data.user),
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
      },
      provider: 'supabase',
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Unable to complete login at this time' });
  }
};

export default loginHandler;
