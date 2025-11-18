import { supabase } from '../config/supabaseClient';
import { fetchAIMapData } from '../api/ai/mapInsights';
import { RFX_STATUS } from '../config/constants';

/**
 * Fetches and merges RFX data with AI-generated map layers
 * @param {Object} filters - Filters for RFX data (status, date range, region, etc.)
 * @returns {Promise<Object>} - Merged map data ready for rendering
 */
export const getMapLayers = async (filters = {}) => {
  try {
    const { region, startDate, endDate, ...otherFilters } = filters;
    
    // Build the base query
    let query = supabase
      .from('rfx_opportunities')
      .select(`
        id,
        title,
        description,
        status,
        location_lat,
        location_lng,
        budget,
        due_date,
        created_at,
        updated_at,
        region
      `);

    // Apply filters
    if (region) {
      query = query.eq('region', region);
    }
    if (startDate) {
      query = query.gte('due_date', startDate.toISOString().split('T')[0]);
    }
    if (endDate) {
      query = query.lte('due_date', endDate.toISOString().split('T')[0]);
    }
    
    // Only show open RFPs by default if no status filter is applied
    if (!otherFilters.status) {
      query = query.eq('status', RFX_STATUS.OPEN);
    }

    const { data: rfxData, error: rfxError } = await query;
    if (rfxError) throw rfxError;

    // Fetch AI-generated map insights if there are any RFXs
    let aiInsights = {};
    if (rfxData && rfxData.length > 0) {
      try {
        aiInsights = await fetchAIMapData({
          rfxIds: rfxData.map(rfx => rfx.id),
          ...filters
        });
      } catch (aiError) {
        console.warn('Failed to fetch AI insights, continuing without them:', aiError);
      }
    }

    // Merge RFX data with AI insights
    const mergedData = rfxData.map(rfx => ({
      ...rfx,
      type: 'Feature',
      geometry: rfx.location_lat && rfx.location_lng ? {
        type: 'Point',
        coordinates: [parseFloat(rfx.location_lng), parseFloat(rfx.location_lat)]
      } : null,
      properties: {
        ...rfx,
        ...(aiInsights[rfx.id] || {})
      }
    })).filter(feature => feature.geometry !== null); // Filter out any features without valid coordinates

    return {
      type: 'FeatureCollection',
      features: mergedData,
      metadata: {
        generated: new Date().toISOString(),
        count: mergedData.length,
        filters: {
          region,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString()
        }
      }
    };
  } catch (error) {
    console.error('Error in getMapLayers:', error);
    throw error;
  }
};

/**
 * Fetches 3D terrain data for a specific region
 * @param {Object} bounds - Map bounds {north, south, east, west}
 * @returns {Promise<Object>} - Terrain data for 3D rendering
 */
export const get3DTerrainData = async (bounds) => {
  try {
    // This would typically call a backend endpoint that processes elevation data
    const response = await fetch('/api/map/terrain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await supabase.auth.session()?.access_token}`
      },
      body: JSON.stringify({
        bounds,
        resolution: 'medium' // Can be 'low', 'medium', 'high'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch terrain data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching terrain data:', error);
    throw error;
  }
};

// For backward compatibility
export default {
  getMapLayers,
  get3DTerrainData
};