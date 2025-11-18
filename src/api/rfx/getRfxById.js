import { supabase } from '../../config/supabase';
import { authenticateRequest } from '../../middleware/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Authenticate the request
    const { user, error: authError } = await authenticateRequest(req);
    if (authError) {
      return res.status(401).json({ error: authError });
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'RFX ID is required' });
    }

    // First, get the RFX
    const { data: rfx, error: fetchError } = await supabase
      .from('rfxs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !rfx) {
      return res.status(404).json({ error: 'RFX not found' });
    }

    // Check if user has permission to view this RFX
    if (rfx.created_by !== user.id && !rfx.is_public && user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view this RFX' });
    }

    // If the user is the creator or admin, include additional data
    if (rfx.created_by === user.id || user.role === 'admin') {
      // Get responses count
      const { count: responsesCount } = await supabase
        .from('rfx_responses')
        .select('*', { count: 'exact', head: true })
        .eq('rfx_id', id);

      // Get views count
      const { count: viewsCount } = await supabase
        .from('rfx_views')
        .select('*', { count: 'exact', head: true })
        .eq('rfx_id', id);

      // Add additional data to the response
      return res.status(200).json({
        ...rfx,
        stats: {
          responses: responsesCount || 0,
          views: viewsCount || 0
        }
      });
    }

    // For non-owners, just return the basic RFX data
    return res.status(200).json(rfx);
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
