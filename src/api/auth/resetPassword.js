import { getSupabaseClient } from '../utils/supabaseClient.js';
import { getFirebaseAdminApp } from '../utils/firebaseAdmin.js';

export const resetPasswordHandler = async (req, res) => {
  const { email, provider = 'supabase', redirectTo } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    if (provider === 'firebase') {
      const firebaseAdmin = await getFirebaseAdminApp();
      if (!firebaseAdmin) {
        return res.status(500).json({ error: 'Firebase admin SDK is not configured' });
      }

      const link = await firebaseAdmin.auth().generatePasswordResetLink(email, {
        url: redirectTo || process.env.APP_URL || 'https://accelprocure.com/reset-password',
      });

      return res.status(200).json({
        provider: 'firebase',
        resetLink: link,
      });
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || process.env.APP_URL || 'https://accelprocure.com/update-password',
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ provider: 'supabase', message: 'Reset email sent' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Unable to process password reset' });
  }
};

export default resetPasswordHandler;
