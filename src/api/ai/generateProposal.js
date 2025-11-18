import { getSupabaseClient } from '../utils/supabaseClient.js';
import { getOpenAiClient } from '../utils/openaiClient.js';

const fallbackProposal = (rfx, vendor) => `Proposal for ${rfx.title}\n\n${vendor.company_name} proposes to deliver on the opportunity by leveraging its core capabilities: ${
  (vendor.capabilities || []).join(', ') || 'capabilities not provided'
}.\n\nWe will meet each requirement and keep pricing within ${rfx.budget_range || 'the requested range'}.`;

export const generateProposalHandler = async (req, res) => {
  const supabase = getSupabaseClient();
  const { rfxId, vendorId = req.user.id, tone = 'professional' } = req.body;

  if (!rfxId) {
    return res.status(400).json({ error: 'rfxId is required' });
  }

  try {
    const [{ data: rfx, error: rfxError }, { data: vendor, error: vendorError }] = await Promise.all([
      supabase.from('rfx_opportunities').select('*').eq('id', rfxId).single(),
      supabase.from('profiles').select('*').eq('id', vendorId).single(),
    ]);

    if (rfxError || vendorError || !rfx || !vendor) {
      return res.status(404).json({ error: 'RFX or vendor profile not found' });
    }

    const openai = getOpenAiClient();
    if (!openai) {
      return res.status(200).json({ proposal: fallbackProposal(rfx, vendor), provider: 'fallback' });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: 'You are a capture expert who writes concise and compliant government proposals.',
        },
        {
          role: 'user',
          content: `Create a ${tone} proposal for the following opportunity and vendor. Return markdown.\n\nRFX: ${
            rfx.title
          }\nRequirements: ${rfx.requirements}\nBudget: ${rfx.budget_range}\n\nVendor: ${vendor.company_name}\nCapabilities: ${
            (vendor.capabilities || []).join(', ')
          }\nDifferentiators: ${(vendor.differentiators || []).join(', ')}`,
        },
      ],
    });

    const content = completion.choices?.[0]?.message?.content;

    return res.status(200).json({ proposal: content, provider: 'openai' });
  } catch (error) {
    console.error('Generate proposal error:', error);
    return res.status(500).json({ error: 'Unable to generate proposal' });
  }
};

export default generateProposalHandler;
