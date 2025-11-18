import { resetPassword, updatePassword } from '../../config/auth.config';

// Request a password reset email
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, token, newPassword } = req.body;

  // Handle password reset request (send email with reset link)
  if (email && !token && !newPassword) {
    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        console.error('Password reset request error:', error.message);
        return res.status(400).json({ 
          error: error.message || 'Failed to send password reset email' 
        });
      }

      // For security, don't reveal if the email exists or not
      return res.status(200).json({ 
        message: 'If an account exists with this email, a password reset link has been sent.' 
      });

    } catch (error) {
      console.error('Password reset request error:', error);
      return res.status(500).json({ 
        error: 'An error occurred while processing your request' 
      });
    }
  }
  // Handle password update with reset token
  else if (token && newPassword) {
    try {
      const { error } = await updatePassword(newPassword);
      
      if (error) throw error;

      return res.status(200).json({ 
        message: 'Password has been successfully updated.' 
      });

    } catch (error) {
      console.error('Password update error:', error);
      return res.status(400).json({ 
        error: error.message || 'Invalid or expired reset token' 
      });
    }
  }
  // Invalid request
  else {
    return res.status(400).json({ 
      error: 'Invalid request. Provide either email (for reset) or token and newPassword (for update).' 
    });
  }
}