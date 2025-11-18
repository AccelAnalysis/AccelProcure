import { supabase } from '../../config/auth.config';

/**
 * Fetches map layer data for RFX opportunities and AI insights
 * @param {Object} filters - Optional filters for the map data
 * @param {string} [filters.region] - Filter by region
 * @param {string} [filters.opportunityType] - Filter by opportunity type
 * @param {Date} [filters.startDate] - Filter by start date
 * @param {Date} [filters.endDate] - Filter by end date
 * @returns {Promise<Object>} - Map layer data
 */
export const getMapData = async (filters = {}) => {
  try {
    // Base query for RFX opportunities
    let query = supabase
      .from('rfx_opportunities')
      .select(`
        id,
        title,
        description,
        location,
        coordinates:location_geojson,
        value,
        due_date,
        opportunity_type,
        status,
        created_at,
        updated_at,
        responses_count
      `)
      .eq('status', 'active')
      .order('due_date', { ascending: true });

    // Apply filters if provided
    if (filters.region) {
      query = query.eq('region', filters.region);
    }
    
    if (filters.opportunityType) {
      query = query.eq('opportunity_type', filters.opportunityType);
    }
    
    if (filters.startDate) {
      query = query.gte('due_date', filters.startDate.toISOString());
    }
    
    if (filters.endDate) {
      query = query.lte('due_date', filters.endDate.toISOString());
    }

    const { data: opportunities, error: oppError } = await query;
    
    if (oppError) throw oppError;

    // Get AI insights for the filtered opportunities
    const opportunityIds = opportunities.map(opp => opp.id);
    const { data: insights, error: insightsError } = await supabase
      .from('ai_insights')
      .select('*')
      .in('opportunity_id', opportunityIds);
      
    if (insightsError) throw insightsError;

    // Format data for map layers
    const formattedData = {
      type: 'FeatureCollection',
      features: opportunities.map(opp => ({
        type: 'Feature',
        geometry: opp.coordinates || {
          type: 'Point',
          coordinates: [0, 0] // Default fallback
        },
        properties: {
          id: opp.id,
          title: opp.title,
          description: opp.description,
          value: opp.value,
          dueDate: opp.due_date,
          type: opp.opportunity_type,
          status: opp.status,
          responses: opp.responses_count,
          insights: insights.find(i => i.opportunity_id === opp.id) || {}
        }
      }))
    };

    return {
      success: true,
      data: formattedData,
      metadata: {
        total: opportunities.length,
        lastUpdated: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error fetching map data:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch map data',
      data: null
    };
  }
};

export default getMapData;