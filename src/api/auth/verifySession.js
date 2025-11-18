import { getSupabaseClient } from '../utils/supabaseClient.js';
import { getFirebaseAdminApp } from '../utils/firebaseAdmin.js';

const parseToken = (req) => {
  if (req.headers.authorization) {
    const [, token] = req.headers.authorization.split(' ');
    return token;
  }
  return req.cookies?.session || req.cookies?.['accelrfx-session'] || null;
};

export const verifySessionHandler = async (req, res) => {
  const token = req.query?.token || parseToken(req);
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) {
      return res.status(200).json({
        valid: true,
        provider: 'supabase',
        user: data.user,
      });
    }

    const firebaseAdmin = await getFirebaseAdminApp();
    if (firebaseAdmin) {
      try {
        const decoded = await firebaseAdmin.auth().verifyIdToken(token);
        return res.status(200).json({
          valid: true,
          provider: 'firebase',
          user: { id: decoded.uid, email: decoded.email },
        });
      } catch (firebaseError) {
        console.warn('Firebase session verification failed:', firebaseError.message);
      }
    }

    return res.status(401).json({ valid: false, error: 'Invalid or expired session' });
  } catch (error) {
    console.error('Session verification error:', error);
    return res.status(500).json({ error: 'Unable to verify session' });
  }
};

export default verifySessionHandler;
