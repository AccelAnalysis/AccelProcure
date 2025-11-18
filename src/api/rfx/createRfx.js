import { getSupabaseClient } from '../utils/supabaseClient.js';

export const createRfxHandler = async (req, res) => {
  const supabase = getSupabaseClient();
  const payload = {
    title: req.body.title,
    description: req.body.description,
    submission_deadline: req.body.submission_deadline,
    budget_range: req.body.budget_range,
    requirements: req.body.requirements,
    category: req.body.category,
    location: req.body.location,
    naics_codes: req.body.naics_codes || [],
    status: req.body.status || 'draft',
    created_by: req.user.id,
  };

  if (!payload.title || !payload.description || !payload.submission_deadline) {
    return res.status(400).json({ error: 'Title, description, and submission_deadline are required' });
  }

  try {
    const { data, error } = await supabase
      .from('rfx_opportunities')
      .insert([{ ...payload, created_at: new Date().toISOString() }])
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ error: 'Failed to create RFX', details: error.message });
    }

    return res.status(201).json({ message: 'RFX created', rfx: data });
  } catch (error) {
    console.error('Create RFX error:', error);
    return res.status(500).json({ error: 'Unable to create RFX' });
  }
};

export default createRfxHandler;
