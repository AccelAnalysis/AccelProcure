import { getSupabaseClient } from '../utils/supabaseClient.js';

export const getRfxListHandler = async (req, res) => {
  const supabase = getSupabaseClient();
  const { status, category, limit = 25, offset = 0 } = req.query;

  try {
    let query = supabase.from('rfx_opportunities').select('*').order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      return res.status(400).json({ error: 'Failed to fetch RFX list', details: error.message });
    }

    return res.status(200).json({ items: data });
  } catch (error) {
    console.error('Get RFX list error:', error);
    return res.status(500).json({ error: 'Unable to fetch RFX list' });
  }
};

export default getRfxListHandler;
