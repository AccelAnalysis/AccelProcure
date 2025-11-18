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
      title, 
      description, 
      deadline, 
      budget_range,
      requirements,
      category,
      location,
      is_public = false
    } = req.body;

    // Validate required fields
    if (!title || !description || !deadline || !requirements || !category) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, description, deadline, requirements, and category are required' 
      });
    }

    // Insert new RFX into database
    const { data: newRfx, error } = await supabase
      .from('rfxs')
      .insert([
        { 
          title,
          description,
          deadline: new Date(deadline).toISOString(),
          budget_range,
          requirements,
          category,
          location,
          is_public,
          created_by: user.id,
          status: 'draft'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating RFX:', error);
      return res.status(500).json({ error: 'Failed to create RFX' });
    }

    return res.status(201).json({
      message: 'RFX created successfully',
      data: newRfx
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
