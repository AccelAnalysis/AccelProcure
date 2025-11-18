import { getSupabaseClient } from '../utils/supabaseClient.js';

export const respondToRfxHandler = async (req, res) => {
  const supabase = getSupabaseClient();
  const { rfxId } = req.params;
  const { content, attachments = [], bid_amount, availability } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Response content is required' });
  }

  try {
    const responsePayload = {
      rfx_id: rfxId,
      responder_id: req.user.id,
      content,
      attachments,
      bid_amount,
      availability,
      created_at: new Date().toISOString(),
      status: 'submitted',
    };

    const existingResponse = await supabase
      .from('rfx_responses')
      .select('id')
      .eq('rfx_id', rfxId)
      .eq('responder_id', req.user.id)
      .maybeSingle();

    if (existingResponse.data) {
      return res.status(400).json({ error: 'You have already responded to this RFX' });
    }

    const { data, error } = await supabase
      .from('rfx_responses')
      .insert([responsePayload])
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ error: 'Failed to submit response', details: error.message });
    }

    return res.status(201).json({ message: 'Response submitted', response: data });
  } catch (error) {
    console.error('Respond to RFX error:', error);
    return res.status(500).json({ error: 'Unable to submit response' });
  }
};

export default respondToRfxHandler;
