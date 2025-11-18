import { getSupabaseClient } from '../utils/supabaseClient.js';
import { getFirebaseAdminApp } from '../utils/firebaseAdmin.js';

const normalizeUser = (user, provider = 'supabase') => ({
  id: user.id,
  email: user.email,
  provider,
  role: user.role || user.app_metadata?.role || 'user',
  metadata: user.user_metadata || user.app_metadata || {},
});

export const registerHandler = async (req, res) => {
  const { email, password, firstName, lastName, company, provider = 'supabase' } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    if (provider === 'firebase') {
      const firebaseAdmin = await getFirebaseAdminApp();
      if (!firebaseAdmin) {
        return res.status(500).json({ error: 'Firebase admin SDK is not configured' });
      }

      const user = await firebaseAdmin.auth().createUser({
        email,
        password,
        displayName: [firstName, lastName].filter(Boolean).join(' '),
      });

      return res.status(201).json({ user: normalizeUser(user, 'firebase') });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          company,
        },
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({
      user: normalizeUser(data.user),
      confirmationSent: true,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Unable to register user at this time' });
  }
};

export default registerHandler;
