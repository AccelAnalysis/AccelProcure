import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Define allowed fields that can be updated
const ALLOWED_FIELDS = [
  'company_name',
  'contact_name',
  'phone_number',
  'address',
  'city',
  'state',
  'zip_code',
  'country',
  'website',
  'naics_codes',
  'business_type',
  'annual_revenue',
  'employee_count',
  'capabilities',
  'past_performance'
];

export default async function handler(req, res) {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Filter and validate the update data
    const updates = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (ALLOWED_FIELDS.includes(key)) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ 
        error: 'No valid fields provided for update',
        allowedFields: ALLOWED_FIELDS
      });
    }

    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString();

    // Update the profile
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return res.status(400).json({ 
        error: 'Failed to update profile',
        details: updateError.message 
      });
    }

    return res.status(200).json({
      message: 'Profile updated successfully',
      profile: profile
    });
    
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}