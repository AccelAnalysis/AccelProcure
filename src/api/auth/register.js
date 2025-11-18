import { signUp } from '../../config/auth.config';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, firstName, lastName, company } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ 
      error: 'Email, password, first name, and last name are required' 
    });
  }

  try {
    const { data, error } = await signUp(email, password, {
      first_name: firstName,
      last_name: lastName,
      company: company || '',
      credits: 10, // Initial signup bonus
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    if (error) {
      console.error('Registration error:', error.message);
      return res.status(400).json({ 
        error: error.message || 'Registration failed' 
      });
    }

    // In a real app, you might want to send a welcome email here
    
    return res.status(201).json({ 
      message: 'Registration successful! Please check your email to verify your account.',
      user: data.user
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      error: 'An unexpected error occurred during registration' 
    });
  }
}