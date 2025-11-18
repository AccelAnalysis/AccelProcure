import { getSupabaseClient } from '../utils/supabaseClient.js';

export const getMapDataHandler = async (_req, res) => {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase.from('map_layers').select('*');
    if (error) {
      return res.status(400).json({ error: 'Unable to load map data', details: error.message });
    }

    return res.status(200).json({ layers: data || [] });
  } catch (error) {
    console.error('Get map data error:', error);
    return res.status(500).json({ error: 'Unable to retrieve map data' });
  }
};

export default getMapDataHandler;
