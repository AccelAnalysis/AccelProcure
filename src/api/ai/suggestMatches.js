import { getSupabaseClient } from '../utils/supabaseClient.js';
import { getOpenAiClient } from '../utils/openaiClient.js';

const baselineRank = (vendors, rfx) =>
  vendors
    .map((vendor) => ({
      vendor,
      score:
        (Array.isArray(vendor.naics_codes)
          ? vendor.naics_codes.filter((code) => rfx.naics_codes?.includes(code)).length * 0.4
          : 0) + (vendor.capabilities ? vendor.capabilities.length * 0.1 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => ({
      vendor_id: entry.vendor.id,
      vendor_name: entry.vendor.company_name,
      match_score: Number((entry.score * 10).toFixed(2)),
      reasoning: 'Ranked using NAICS overlap and capability depth',
    }));

export const suggestMatchesHandler = async (req, res) => {
  const supabase = getSupabaseClient();
  const { rfxId, limit = 5 } = req.body;

  if (!rfxId) {
    return res.status(400).json({ error: 'rfxId is required' });
  }

  try {
    const [{ data: rfx, error: rfxError }, { data: vendors, error: vendorError }] = await Promise.all([
      supabase.from('rfx_opportunities').select('*').eq('id', rfxId).single(),
      supabase.from('profiles').select('*').neq('id', req.user.id).limit(50),
    ]);

    if (rfxError || vendorError || !rfx || !vendors) {
      return res.status(400).json({ error: 'Unable to load RFX or vendor data' });
    }

    const openai = getOpenAiClient();
    if (!openai) {
      return res.status(200).json({ matches: baselineRank(vendors, rfx).slice(0, limit), provider: 'fallback' });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'You rank vendor suitability for federal opportunities and must return JSON.',
        },
        {
          role: 'user',
          content: `RFX Title: ${rfx.title}\nRequirements: ${rfx.requirements}\nVendors: ${JSON.stringify(
            vendors.map((vendor) => ({
              id: vendor.id,
              name: vendor.company_name,
              capabilities: vendor.capabilities,
              pastPerformance: vendor.past_performance,
            })),
          )}\nReturn an array named matches with vendorId, matchScore (0-1), and reasoning. Limit to ${limit}.`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices?.[0]?.message?.content;
    const parsed = JSON.parse(raw || '{}');
    const matches = Array.isArray(parsed.matches)
      ? parsed.matches.map((match) => ({
          vendor_id: match.vendorId,
          match_score: Number((match.matchScore * 100).toFixed(2)),
          reasoning: match.reasoning,
        }))
      : baselineRank(vendors, rfx).slice(0, limit);

    return res.status(200).json({ matches, provider: 'openai' });
  } catch (error) {
    console.error('Suggest matches error:', error);
    return res.status(500).json({ error: 'Unable to suggest matches' });
  }
};

export default suggestMatchesHandler;
