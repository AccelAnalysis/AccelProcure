import { getCurrentUser, supabase } from '../../config/auth.config';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the token from the Authorization header
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ 
      error: 'No authentication token provided' 
    });
  }

  try {
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Session verification error:', error?.message || 'No user found');
      return res.status(401).json({ 
        error: 'Invalid or expired session' 
      });
    }

    // Get additional user data if needed
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user profile:', userError.message);
      // Continue with basic user data even if profile fetch fails
      return res.status(200).json({ 
        user: {
          id: user.id,
          email: user.email,
          email_confirmed_at: user.email_confirmed_at,
          last_sign_in_at: user.last_sign_in_at
        },
        session: { valid: true }
      });
    }

    // Return combined user data
    return res.status(200).json({
      user: {
        ...user,
        ...userData
      },
      session: { valid: true }
    });

  } catch (error) {
    console.error('Session verification error:', error);
    return res.status(500).json({ 
      error: 'An error occurred while verifying your session' 
    });
  }
}