/**
 * @module Map3D
 * @description Core module for initializing and managing the 3D map visualization.
 * Integrates Mapbox GL JS with Deck.gl for advanced 3D visualizations and interactions.
 */

import mapboxgl from 'mapbox-gl';
import { MapboxLayer } from '@deck.gl/mapbox';
import { GeoJsonLayer, ArcLayer, ScatterplotLayer } from 'deck.gl';
import { mapConfig } from '../config/mapbox.config';
import { getMapLayers, get3DTerrainData } from '../services/mapService';
import { getCurrentUser } from '../services/authService';
import { debounce } from './shared';

/**
 * Initializes a 3D map with terrain, buildings, and AI visualization layers.
 * @async
 * @function initMap3D
 * @returns {Promise<mapboxgl.Map|null>} Initialized Mapbox GL map instance or null if initialization fails.
 * @throws {Error} If Mapbox token is missing or map initialization fails.
 * @example
 * const map = await initMap3D();
 * if (map) {
 *   // Map is ready for interaction
 * }
 */
export async function initMap3D() {
  // Check if Mapbox token is available
  if (!mapboxgl.accessToken) {
    console.error('Mapbox token not found. Please set VITE_MAPBOX_TOKEN in your .env file');
    return null;
  }

  // Initialize the map
  const map = new mapboxgl.Map({
    ...mapConfig,
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    antialias: true,
    maxPitch: 85,
    attributionControl: false
  });

  // Add navigation controls
  map.addControl(new mapboxgl.NavigationControl(), 'top-right');
  map.addControl(new mapboxgl.ScaleControl());

  // Wait for map to load
  map.on('load', async () => {
    try {
      // Add 3D terrain source
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14
      });

      // Add sky layer for realistic lighting
      map.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 0.0],
          'sky-atmosphere-sun-intensity': 15
        }
      });

      // Add 3D terrain
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

      // Add 3D buildings
      await add3DBuildings(map);
      
      // Load RFX data and add to map
      await loadAndDisplayRFXData(map);
      
      // Set up event listeners
      setupMapEventListeners(map);
      
      console.log('Map initialization complete');
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  });

  // Handle map errors
  map.on('error', (e) => {
    console.error('Map error:', e.error);
  });

  return map;
}

/**
 * Adds 3D buildings layer to the map using Mapbox's vector tiles.
 * @private
 * @async
 * @function add3DBuildings
 * @param {mapboxgl.Map} map - The Mapbox GL map instance.
 * @returns {Promise<void>}
 */
async function add3DBuildings(map) {
  // Add 3D buildings from Mapbox's vector tiles
  map.addLayer({
    'id': '3d-buildings',
    'source': 'composite',
    'source-layer': 'building',
    'filter': ['==', 'extrude', 'true'],
    'type': 'fill-extrusion',
    'minzoom': 15,
    'paint': {
      'fill-extrusion-color': '#aaa',
      'fill-extrusion-height': [
        'interpolate',
        ['linear'],
        ['zoom'],
        15,
        0,
        15.05,
        ['get', 'height']
      ],
      'fill-extrusion-base': [
        'interpolate',
        ['linear'],
        ['zoom'],
        15,
        0,
        15.05,
        ['get', 'min_height'] || 0
      ],
      'fill-extrusion-opacity': 0.6
    }
  });
}

/**
 * Fetches RFX data and renders it as interactive Deck.gl layers on the map.
 * Handles data loading states and error conditions.
 * @private
 * @async
 * @function loadAndDisplayRFXData
 * @param {mapboxgl.Map} map - The Mapbox GL map instance.
 * @returns {Promise<void>}
 */
async function loadAndDisplayRFXData(map) {
  try {
    const user = getCurrentUser();
    const filters = {
      status: 'active',
      region: user?.region || 'global'
    };

    // Get map data from service
    const { rfxData, aiInsights } = await getMapLayers(filters);
    
    if (!rfxData || rfxData.length === 0) {
      console.log('No RFX data available');
      return;
    }

    // Convert RFX data to GeoJSON format
    const rfxGeoJSON = {
      type: 'FeatureCollection',
      features: rfxData.map(rfx => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [rfx.location_lng, rfx.location_lat]
        },
        properties: {
          id: rfx.id,
          title: rfx.title,
          budget: rfx.budget,
          status: rfx.status,
          dueDate: rfx.due_date,
          ...rfx
        }
      }))
    };

    // Add RFX points layer
    const rfxLayer = new MapboxLayer({
      id: 'rfx-points',
      type: ScatterplotLayer,
      data: rfxGeoJSON.features,
      pickable: true,
      filled: true,
      radiusMinPixels: 5,
      radiusMaxPixels: 20,
      getPosition: d => d.geometry.coordinates,
      getFillColor: d => {
        // Color by status
        switch (d.properties.status) {
          case 'open': return [0, 128, 255]; // Blue
          case 'awarded': return [0, 200, 0]; // Green
          case 'closed': return [200, 0, 0]; // Red
          default: return [128, 128, 128]; // Gray
        }
      },
      getRadius: d => {
        // Scale by budget
        const budget = d.properties.budget || 0;
        return Math.min(10 + Math.log10(budget + 1) * 2, 30);
      },
      onHover: ({ object, x, y }) => {
        // Show tooltip on hover
        if (object) {
          // Update tooltip position and content
          const tooltip = document.getElementById('map-tooltip');
          if (tooltip) {
            tooltip.style.display = 'block';
            tooltip.style.left = `${x}px`;
            tooltip.style.top = `${y}px`;
            tooltip.innerHTML = `
              <strong>${object.properties.title}</strong><br>
              Status: ${object.properties.status}<br>
              Budget: $${object.properties.budget?.toLocaleString() || 'N/A'}<br>
              Due: ${new Date(object.properties.dueDate).toLocaleDateString()}
            `;
          }
        } else {
          // Hide tooltip
          const tooltip = document.getElementById('map-tooltip');
          if (tooltip) tooltip.style.display = 'none';
        }
      }
    });

    // Add AI insights as heatmap layer if available
    if (aiInsights && aiInsights.heatmap) {
      const heatmapLayer = new MapboxLayer({
        id: 'ai-heatmap',
        type: HeatmapLayer,
        data: aiInsights.heatmap,
        getPosition: d => [d.lng, d.lat],
        getWeight: d => d.intensity,
        radiusPixels: 30,
        intensity: 1,
        threshold: 0.05,
        colorRange: [
          [0, 0, 255, 0],
          [0, 0, 255, 0.5],
          [0, 255, 0, 0.7],
          [255, 255, 0, 0.8],
          [255, 0, 0, 1]
        ]
      });
      map.addLayer(heatmapLayer);
    }

    // Add the RFX layer to the map
    map.addLayer(rfxLayer);
    
    // Fit bounds to show all RFX points
    if (rfxData.length > 0) {
      const bounds = rfxData.reduce((bounds, rfx) => {
        return bounds.extend([rfx.location_lng, rfx.location_lat]);
      }, new mapboxgl.LngLatBounds());
      
      map.fitBounds(bounds, {
        padding: { top: 100, bottom: 100, left: 100, right: 100 },
        maxZoom: 12
      });
    }
  } catch (error) {
    console.error('Error loading RFX data:', error);
  }
}

/**
 * Configures event listeners for map interactions including view changes and layer interactions.
 * @private
 * @function setupMapEventListeners
 * @param {mapboxgl.Map} map - The Mapbox GL map instance.
 */
function setupMapEventListeners(map) {
  // Debounce the resize event for better performance
  const debouncedResize = debounce(() => {
    map.resize();
  }, 250);
  
  window.addEventListener('resize', debouncedResize);
  
  // Clean up event listeners when map is removed
  map.on('remove', () => {
    window.removeEventListener('resize', debouncedResize);
  });
  
  // Handle clicks on RFX points
  map.on('click', 'rfx-points', (e) => {
    if (e.features.length > 0) {
      const rfxId = e.features[0].properties.id;
      // Emit custom event or navigate to RFX detail view
      document.dispatchEvent(new CustomEvent('rfx:selected', { 
        detail: { rfxId } 
      }));
    }
  });
  
  // Change cursor to pointer when hovering over RFX points
  map.on('mouseenter', 'rfx-points', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  
  map.on('mouseleave', 'rfx-points', () => {
    map.getCanvas().style.cursor = '';
  });
}

/**
 * @namespace Map3D
 * @description Public API for the 3D map module.
 */
const Map3D = {
  /**
   * @see module:Map3D~initMap3D
   */
  initMap3D
};

export default Map3D;