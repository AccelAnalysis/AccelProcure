import { getSupabaseClient } from '../utils/supabaseClient.js';

export const get3dTerrainHandler = async (req, res) => {
  const supabase = getSupabaseClient();
  const { bbox } = req.query;

  try {
    const { data, error } = await supabase
      .from('map_terrain_tiles')
      .select('*')
      .limit(100);

    if (error) {
      return res.status(400).json({ error: 'Unable to fetch terrain tiles', details: error.message });
    }

    return res.status(200).json({
      tiles: data || [],
      bbox: bbox ? bbox.split(',').map(Number) : undefined,
    });
  } catch (error) {
    console.error('3D terrain error:', error);
    return res.status(500).json({ error: 'Unable to fetch terrain data' });
  }
};

export default get3dTerrainHandler;
