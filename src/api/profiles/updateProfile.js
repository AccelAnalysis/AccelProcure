import { getSupabaseClient } from '../utils/supabaseClient.js';

const ALLOWED_FIELDS = new Set([
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
  'past_performance',
  'duns_number',
  'uei_number',
]);

export const updateProfileHandler = async (req, res) => {
  const updates = Object.entries(req.body || {}).reduce((acc, [key, value]) => {
    if (ALLOWED_FIELDS.has(key)) {
      acc[key] = value;
    }
    return acc;
  }, {});

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided' });
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', req.user.id)
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ error: 'Failed to update profile', details: error.message });
    }

    return res.status(200).json({ message: 'Profile updated', profile: data });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Unable to update profile' });
  }
};

export default updateProfileHandler;
