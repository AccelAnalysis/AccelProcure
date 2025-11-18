import { supabase } from '../../config/auth.config';

/**
 * Updates and returns heatmap data based on RFX opportunities and responses
 * @param {Object} bounds - Map bounds for spatial filtering
 * @param {Object} bounds.sw - Southwest corner coordinates {lng, lat}
 * @param {Object} bounds.ne - Northeast corner coordinates {lng, lat}
 * @param {string} [timeRange='30d'] - Time range for filtering data (e.g., '7d', '30d', '90d', 'all')
 * @param {string} [opportunityType] - Optional filter by opportunity type
 * @returns {Promise<Object>} - Heatmap data and statistics
 */
export const updateHeatmap = async (bounds, timeRange = '30d', opportunityType) => {
  try {
    // Calculate date range based on timeRange parameter
    const now = new Date();
    let startDate = new Date();
    
    switch(timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case 'all':
        startDate = new Date(0); // Unix epoch start
        break;
      case '30d':
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Build the base query with spatial and temporal filters
    let query = supabase
      .rpc('get_heatmap_data', {
        min_lng: bounds.sw.lng,
        min_lat: bounds.sw.lat,
        max_lng: bounds.ne.lng,
        max_lat: bounds.ne.lat,
        start_date: startDate.toISOString(),
        end_date: now.toISOString()
      });

    // Apply opportunity type filter if provided
    if (opportunityType) {
      query = query.eq('opportunity_type', opportunityType);
    }

    const { data: heatmapData, error } = await query;
    
    if (error) throw error;

    // Calculate statistics
    const totalOpportunities = heatmapData.reduce((sum, item) => sum + item.count, 0);
    const totalValue = heatmapData.reduce((sum, item) => sum + (item.total_value || 0), 0);
    const avgValue = totalOpportunities > 0 ? totalValue / totalOpportunities : 0;

    // Format the response
    return {
      success: true,
      data: {
        points: heatmapData.map(item => ({
          coordinates: [item.longitude, item.latitude],
          weight: item.count,
          value: item.avg_value || 0,
          intensity: Math.min(1, item.count / Math.max(1, Math.max(...heatmapData.map(d => d.count)) / 3))
        })),
        stats: {
          totalOpportunities,
          totalValue,
          avgValue,
          timeRange: {
            start: startDate.toISOString(),
            end: now.toISOString(),
            label: timeRange
          },
          lastUpdated: new Date().toISOString()
        }
      }
    };
  } catch (error) {
    console.error('Error updating heatmap:', error);
    return {
      success: false,
      error: error.message || 'Failed to update heatmap data',
      data: null
    };
  }
};

/**
 * Gets heatmap data for a specific RFX opportunity
 * @param {string} opportunityId - The ID of the RFX opportunity
 * @returns {Promise<Object>} - Heatmap data for the specific opportunity
 */
export const getOpportunityHeatmap = async (opportunityId) => {
  try {
    const { data, error } = await supabase
      .rpc('get_opportunity_heatmap', { opportunity_id: opportunityId });
    
    if (error) throw error;

    return {
      success: true,
      data: {
        opportunityId,
        heatmap: data.map(item => ({
          coordinates: [item.longitude, item.latitude],
          weight: item.intensity,
          timestamp: item.timestamp
        }))
      }
    };
  } catch (error) {
    console.error(`Error getting heatmap for opportunity ${opportunityId}:`, error);
    return {
      success: false,
      error: error.message || 'Failed to get opportunity heatmap',
      data: null
    };
  }
};

export default updateHeatmap;