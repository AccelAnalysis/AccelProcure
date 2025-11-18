import { getSupabaseClient } from '../utils/supabaseClient.js';

export const updateHeatmapHandler = async (req, res) => {
  const supabase = getSupabaseClient();
  const { points } = req.body;

  if (!Array.isArray(points) || points.length === 0) {
    return res.status(400).json({ error: 'points array is required' });
  }

  try {
    const { data, error } = await supabase
      .from('map_heatmap_points')
      .insert(points.map((point) => ({ ...point, created_by: req.user.id })))
      .select('*');

    if (error) {
      return res.status(400).json({ error: 'Unable to update heatmap', details: error.message });
    }

    return res.status(200).json({ message: 'Heatmap updated', points: data });
  } catch (error) {
    console.error('Update heatmap error:', error);
    return res.status(500).json({ error: 'Unable to update heatmap' });
  }
};

export default updateHeatmapHandler;
