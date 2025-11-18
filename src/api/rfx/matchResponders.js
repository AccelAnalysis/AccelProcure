import { getSupabaseClient } from '../utils/supabaseClient.js';

const calculateMatchScore = (vendor, rfx) => {
  let score = 0;
  if (Array.isArray(vendor.naics_codes) && Array.isArray(rfx.naics_codes)) {
    const overlap = vendor.naics_codes.filter((code) => rfx.naics_codes.includes(code));
    score += overlap.length * 10;
  }

  if (vendor.capabilities && rfx.requirements) {
    const capabilityScore = vendor.capabilities.filter((capability) =>
      rfx.requirements.toLowerCase().includes(capability.toLowerCase()),
    ).length;
    score += capabilityScore * 5;
  }

  if (vendor.past_performance) {
    score += Math.min(vendor.past_performance.length * 2, 20);
  }

  return Number(score.toFixed(2));
};

export const matchRespondersHandler = async (req, res) => {
  const supabase = getSupabaseClient();
  const { rfxId } = req.params;

  try {
    const { data: rfx, error: rfxError } = await supabase
      .from('rfx_opportunities')
      .select('*')
      .eq('id', rfxId)
      .single();

    if (rfxError || !rfx) {
      return res.status(404).json({ error: 'RFX not found' });
    }

    const { data: vendors, error: vendorError } = await supabase.from('profiles').select('*').neq('id', req.user.id);

    if (vendorError) {
      return res.status(400).json({ error: 'Failed to load vendor profiles', details: vendorError.message });
    }

    const matches = (vendors || [])
      .map((vendor) => ({
        vendor_id: vendor.id,
        vendor_name: vendor.company_name,
        score: calculateMatchScore(vendor, rfx),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Number(req.query.limit) || 5);

    return res.status(200).json({ matches });
  } catch (error) {
    console.error('Match responders error:', error);
    return res.status(500).json({ error: 'Unable to match responders' });
  }
};

export default matchRespondersHandler;
