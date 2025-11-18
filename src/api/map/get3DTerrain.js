import { supabase } from '../../config/auth.config';
import mapboxgl from 'mapbox-gl';

// Initialize Mapbox token (should be set in environment variables)
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

/**
 * Fetches 3D terrain data for a given bounding box
 * @param {Object} bounds - Bounding box coordinates
 * @param {Object} bounds.sw - Southwest corner {lng, lat}
 * @param {Object} bounds.ne - Northeast corner {lng, lat}
 * @param {number} [zoom=12] - Zoom level for terrain detail
 * @returns {Promise<Object>} - 3D terrain data and metadata
 */
export const get3DTerrain = async (bounds, zoom = 12) => {
  try {
    // Calculate center point and bounding box
    const center = [
      (bounds.sw.lng + bounds.ne.lng) / 2,
      (bounds.sw.lat + bounds.ne.lat) / 2
    ];

    // Get elevation data using Mapbox Terrain-RGB
    const elevationData = await fetchElevationData(bounds, zoom);
    
    // Get 3D building data if available
    const buildingData = await fetch3DBuildings(bounds);
    
    // Get terrain exaggeration based on zoom level
    const exaggeration = calculateTerrainExaggeration(zoom);
    
    return {
      success: true,
      data: {
        center,
        bounds,
        zoom,
        exaggeration,
        elevation: elevationData,
        buildings: buildingData,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error fetching 3D terrain data:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch 3D terrain data',
      data: null
    };
  }
};

/**
 * Fetches elevation data for the given bounds
 * @private
 */
async function fetchElevationData(bounds, zoom) {
  // Calculate the number of points to sample (simplified for this example)
  const points = [];
  const lngStep = (bounds.ne.lng - bounds.sw.lng) / 10;
  const latStep = (bounds.ne.lat - bounds.sw.lat) / 10;
  
  // Sample points in a grid
  for (let lng = bounds.sw.lng; lng <= bounds.ne.lng; lng += lngStep) {
    for (let lat = bounds.sw.lat; lat <= bounds.ne.lat; lat += latStep) {
      points.push([lng, lat]);
    }
  }
  
  // In a real implementation, you would use Mapbox's elevation API here
  // For now, we'll return mock elevation data
  return {
    type: 'FeatureCollection',
    features: points.map(([lng, lat], i) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      properties: {
        elevation: Math.random() * 1000, // Mock elevation in meters
        resolution: 30 // Approximate resolution in meters
      }
    }))
  };
}

/**
 * Fetches 3D building data for the given bounds
 * @private
 */
async function fetch3DBuildings(bounds) {
  try {
    // In a real implementation, you would query your database for 3D building data
    // For now, we'll return mock data
    return {
      type: 'FeatureCollection',
      features: []
    };
  } catch (error) {
    console.warn('Could not fetch 3D building data:', error);
    return null;
  }
}

/**
 * Calculates terrain exaggeration based on zoom level
 * @private
 */
function calculateTerrainExaggeration(zoom) {
  // Higher zoom levels get more exaggeration for better visualization
  if (zoom > 16) return 2.0;
  if (zoom > 14) return 1.5;
  if (zoom > 12) return 1.2;
  return 1.0;
}

/**
 * Gets elevation at a specific point
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 * @returns {Promise<Object>} - Elevation data for the point
 */
export const getElevationAtPoint = async (lng, lat) => {
  try {
    // In a real implementation, you would use a more accurate elevation service
    return {
      success: true,
      data: {
        coordinates: [lng, lat],
        elevation: Math.random() * 1000, // Mock elevation
        resolution: 30,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error(`Error getting elevation at [${lng}, ${lat}]:`, error);
    return {
      success: false,
      error: error.message || 'Failed to get elevation data',
      data: null
    };
  }
};

export default get3DTerrain;