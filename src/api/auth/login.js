import { signIn } from '../../config/auth.config';
import { APP_CONFIG } from '../../config/app.config';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      error: 'Email and password are required' 
    });
  }

  try {
    const { data, error } = await signIn(email, password);

    if (error) {
      console.error('Login error:', error.message);
      return res.status(401).json({ 
        error: error.message || 'Invalid login credentials' 
      });
    }

    // Set secure HTTP-only cookie
    res.setHeader('Set-Cookie', `session=${data.session.access_token}; Path=/; HttpOnly; Secure; SameSite=Strict`);
    
    return res.status(200).json({ 
      user: data.user,
      session: data.session
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      error: 'An unexpected error occurred during login' 
    });
  }
}