import { supabase } from '../../config/supabase';
import { authenticateRequest } from '../../middleware/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Authenticate the request
    const { user, error: authError } = await authenticateRequest(req);
    if (authError) {
      return res.status(401).json({ error: authError });
    }

    const { 
      rfx_id, 
      proposal, 
      proposed_budget, 
      timeline_weeks,
      additional_notes,
      attachments = []
    } = req.body;

    // Validate required fields
    if (!rfx_id || !proposal || !proposed_budget || !timeline_weeks) {
      return res.status(400).json({ 
        error: 'Missing required fields: rfx_id, proposal, proposed_budget, and timeline_weeks are required' 
      });
    }

    // Check if the RFX exists and is open for responses
    const { data: rfx, error: rfxError } = await supabase
      .from('rfxs')
      .select('status, deadline')
      .eq('id', rfx_id)
      .single();

    if (rfxError || !rfx) {
      return res.status(404).json({ error: 'RFX not found' });
    }

    // Check if RFX is open for responses
    if (rfx.status !== 'open') {
      return res.status(400).json({ error: 'This RFX is not currently accepting responses' });
    }

    // Check if the deadline has passed
    if (new Date(rfx.deadline) < new Date()) {
      return res.status(400).json({ error: 'The deadline for this RFX has passed' });
    }

    // Check if user has already responded to this RFX
    const { data: existingResponse, error: existingError } = await supabase
      .from('rfx_responses')
      .select('id')
      .eq('rfx_id', rfx_id)
      .eq('responder_id', user.id)
      .single();

    if (existingResponse) {
      return res.status(400).json({ error: 'You have already responded to this RFX' });
    }

    // Create the response
    const { data: response, error: responseError } = await supabase
      .from('rfx_responses')
      .insert([
        {
          rfx_id,
          responder_id: user.id,
          proposal,
          proposed_budget: parseFloat(proposed_budget),
          timeline_weeks: parseInt(timeline_weeks, 10),
          additional_notes,
          status: 'submitted',
          attachments
        }
      ])
      .select()
      .single();

    if (responseError) {
      console.error('Error creating RFX response:', responseError);
      return res.status(500).json({ error: 'Failed to submit response' });
    }

    // Update the RFX's response count
    await supabase.rpc('increment_rfx_response_count', {
      rfx_id
    });

    // TODO: Send notification to RFX creator

    return res.status(201).json({
      message: 'Response submitted successfully',
      data: response
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
