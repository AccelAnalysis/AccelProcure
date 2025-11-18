import mapboxgl from 'mapbox-gl';
import { mapConfig, MAPBOX_TOKEN } from '../config/mapbox.config.js';
import { get3DTerrainData } from '../services/mapService.js';
import { initAIOverlay } from './map-ai.js';
import { showError } from './shared.js';

const SKY_LAYER_ID = 'map-sky';
const BUILDING_LAYER_ID = 'map-3d-buildings';

let activeMap = null;

export async function initMap({ containerId = 'map', filters = {} } = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn('Map container not found');
    return null;
  }

  if (!mapboxgl.accessToken) {
    mapboxgl.accessToken = MAPBOX_TOKEN;
  }

  activeMap = new mapboxgl.Map({
    ...mapConfig,
    container: containerId,
  });

  addControls(activeMap);
  await waitForLoad(activeMap);
  await Promise.all([addTerrain(activeMap), add3dBuildings(activeMap)]);

  const aiOverlay = initAIOverlay(activeMap);
  await aiOverlay.load(filters);

  ensureTooltipElement(container);

  const controller = {
    map: activeMap,
    aiOverlay,
    refreshData: (nextFilters = filters) => aiOverlay.load(nextFilters),
    destroy: () => {
      aiOverlay.destroy();
      if (activeMap) {
        activeMap.remove();
        activeMap = null;
      }
    },
  };

  activeMap.on('remove', () => aiOverlay.destroy());
  return controller;
}

function addControls(map) {
  map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');
  map.addControl(new mapboxgl.FullscreenControl());
  map.addControl(new mapboxgl.ScaleControl({ maxWidth: 120, unit: 'metric' }));
}

async function addTerrain(map) {
  if (!map.getSource('mapbox-dem')) {
    map.addSource('mapbox-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    });
  }

  map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

  if (!map.getLayer(SKY_LAYER_ID)) {
    map.addLayer({
      id: SKY_LAYER_ID,
      type: 'sky',
      paint: {
        'sky-type': 'atmosphere',
        'sky-atmosphere-sun': [0.0, 0.0],
        'sky-atmosphere-sun-intensity': 12,
      },
    });
  }

  try {
    const bounds = map.getBounds();
    await get3DTerrainData({
      west: bounds.getWest(),
      east: bounds.getEast(),
      north: bounds.getNorth(),
      south: bounds.getSouth(),
    });
  } catch (error) {
    console.debug('Optional terrain enrichment failed', error);
  }
}

async function add3dBuildings(map) {
  if (map.getLayer(BUILDING_LAYER_ID)) {
    return;
  }

  const layers = map.getStyle()?.layers || [];
  let labelLayerId = null;
  for (const layer of layers) {
    if (layer.type === 'symbol' && layer.layout['text-field']) {
      labelLayerId = layer.id;
      break;
    }
  }

  map.addLayer(
    {
      id: BUILDING_LAYER_ID,
      source: 'composite',
      'source-layer': 'building',
      filter: ['==', 'extrude', 'true'],
      type: 'fill-extrusion',
      minzoom: 15,
      paint: {
        'fill-extrusion-color': '#9ca3af',
        'fill-extrusion-height': [
          'interpolate',
          ['linear'],
          ['zoom'],
          15,
          0,
          15.05,
          ['get', 'height'],
        ],
        'fill-extrusion-base': [
          'interpolate',
          ['linear'],
          ['zoom'],
          15,
          0,
          15.05,
          ['get', 'min_height'],
        ],
        'fill-extrusion-opacity': 0.6,
      },
    },
    labelLayerId || undefined,
  );
}

function ensureTooltipElement(container) {
  if (container.querySelector('#map-tooltip')) {
    return;
  }
  const tooltip = document.createElement('div');
  tooltip.id = 'map-tooltip';
  tooltip.className = 'map-tooltip hidden';
  container.appendChild(tooltip);
}

function waitForLoad(map) {
  return new Promise((resolve, reject) => {
    const onError = (event) => {
      map.off('load', onLoad);
      reject(event?.error || new Error('Map failed to load'));
      showError('Unable to load 3D map data');
    };

    const onLoad = () => {
      map.off('error', onError);
      resolve();
    };

    map.once('load', onLoad);
    map.once('error', onError);
  });
}

export default initMap;
