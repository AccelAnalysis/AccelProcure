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

    const { 
      page = 1, 
      limit = 10, 
      status, 
      category, 
      sortBy = 'created_at', 
      sortOrder = 'desc',
      search = ''
    } = req.query;

    const offset = (page - 1) * limit;

    // Build the base query
    let query = supabase
      .from('rfxs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (category) {
      query = query.eq('category', category);
    }

    // Search in title and description
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // For non-admin users, only show their own RFXs or public ones
    if (user.role !== 'admin') {
      query = query.or(`created_by.eq.${user.id},is_public.eq.true`);
    }

    const { data: rfxs, error, count } = await query;

    if (error) {
      console.error('Error fetching RFXs:', error);
      return res.status(500).json({ error: 'Failed to fetch RFXs' });
    }

    return res.status(200).json({
      data: rfxs || [],
      pagination: {
        total: count || 0,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
