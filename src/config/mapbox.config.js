import 'mapbox-gl/dist/mapbox-gl.css';

// Use the environment variable from Vite
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || process.env.VITE_MAPBOX_TOKEN;

if (!MAPBOX_TOKEN) {
  console.warn('Mapbox token is not set. Please add VITE_MAPBOX_TOKEN to your .env file');
  // You might want to show a user-friendly error in production
  if (import.meta.env.PROD) {
    console.error('Mapbox token is required for the application to function');
  }
}

export const mapConfig = {
  accessToken: MAPBOX_TOKEN,
  style: 'mapbox://styles/mapbox/streets-v12',
  container: 'map',
  center: [-74.5, 40], // Default center (longitude, latitude)
  zoom: 9, // Default zoom level
  pitch: 45, // Tilt angle in degrees
  bearing: 0, // Rotation in degrees
  minZoom: 2,
  maxZoom: 22,
  maxPitch: 60,
  antialias: true, // Improves rendering quality
  hash: false, // Set to true to enable URL hash state
  attributionControl: true,
  customAttribution: '© AccelRFx',
  // 3D Terrain
  terrain: {
    source: 'mapbox-dem',
    exaggeration: 1.5
  },
  // Terrain source
  sources: {
    'mapbox-dem': {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14
    }
  },
  // Fog effect
  fog: {
    color: 'rgb(186, 210, 235)',
    'high-color': 'rgb(36, 92, 223)',
    'horizon-blend': 0.02,
    'space-color': 'rgb(11, 11, 25)',
    'star-intensity': 0.6
  }
};

export const deckConfig = {
  initialViewState: {
    longitude: -74.5,
    latitude: 40,
    zoom: 9,
    pitch: 45,
    bearing: 0
  },
  controller: true,
  style: {
    width: '100%',
    height: '100%'
  }
};

export const mapLayers = {
  // Define common layer configurations here
  heatmap: {
    id: 'heatmap',
    type: 'heatmap',
    maxzoom: 15,
    paint: {
      'heatmap-weight': 1,
      'heatmap-intensity': 1,
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(33,102,172,0)',
        0.2, 'rgb(103,169,207)',
        0.4, 'rgb(209,229,240)',
        0.6, 'rgb(253,219,199)',
        0.8, 'rgb(239,138,98)',
        1, 'rgb(178,24,43)'
      ],
      'heatmap-radius': 20,
      'heatmap-opacity': 0.8
    }
  }
};