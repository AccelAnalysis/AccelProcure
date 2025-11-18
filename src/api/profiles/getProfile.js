import { getSupabaseClient } from '../utils/supabaseClient.js';

const sanitizeProfile = (profile) => {
  if (!profile) return null;
  const { sensitive_notes, ...safeProfile } = profile;
  return safeProfile;
};

export const getProfileHandler = async (req, res) => {
  const supabase = getSupabaseClient();
  const targetId = req.params.profileId || req.user?.id;

  if (!targetId) {
    return res.status(400).json({ error: 'Profile id is required' });
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    return res.status(200).json({ profile: sanitizeProfile(data) });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Unable to fetch profile' });
  }
};

export default getProfileHandler;
