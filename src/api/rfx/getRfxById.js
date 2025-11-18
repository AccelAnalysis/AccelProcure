import { getSupabaseClient } from '../utils/supabaseClient.js';

export const getRfxByIdHandler = async (req, res) => {
  const supabase = getSupabaseClient();
  const { rfxId } = req.params;

  try {
    const { data, error } = await supabase
      .from('rfx_opportunities')
      .select('*')
      .eq('id', rfxId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'RFX not found' });
    }

    return res.status(200).json({ rfx: data });
  } catch (error) {
    console.error('Get RFX error:', error);
    return res.status(500).json({ error: 'Unable to fetch RFX' });
  }
};

export default getRfxByIdHandler;
