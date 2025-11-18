import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { ENV_CONFIG } from './app.config';

const MAPBOX_TOKEN = ENV_CONFIG.MAPBOX_TOKEN;

if (!MAPBOX_TOKEN) {
  console.warn('Mapbox token is not set. Please add VITE_MAPBOX_TOKEN to your environment.');
} else {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

export const mapConfig = {
  accessToken: MAPBOX_TOKEN,
  style: 'mapbox://styles/mapbox/streets-v12',
  container: 'map',
  center: [-74.5, 40],
  zoom: 9,
  pitch: 45,
  bearing: 0,
  minZoom: 2,
  maxZoom: 22,
  maxPitch: 60,
  antialias: true,
  hash: false,
  attributionControl: true,
  customAttribution: '© AccelRFx',
  terrain: {
    source: 'mapbox-dem',
    exaggeration: 1.5,
  },
  sources: {
    'mapbox-dem': {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    },
  },
  fog: {
    color: 'rgb(186, 210, 235)',
    'high-color': 'rgb(36, 92, 223)',
    'horizon-blend': 0.02,
    'space-color': 'rgb(11, 11, 25)',
    'star-intensity': 0.6,
  },
};

export const deckConfig = {
  initialViewState: {
    longitude: -74.5,
    latitude: 40,
    zoom: 9,
    pitch: 45,
    bearing: 0,
  },
  controller: true,
  style: {
    width: '100%',
    height: '100%',
  },
};

export const mapLayers = {
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
        0,
        'rgba(33,102,172,0)',
        0.2,
        'rgb(103,169,207)',
        0.4,
        'rgb(209,229,240)',
        0.6,
        'rgb(253,219,199)',
        0.8,
        'rgb(239,138,98)',
        1,
        'rgb(178,24,43)',
      ],
      'heatmap-radius': 20,
      'heatmap-opacity': 0.8,
    },
  },
};

export { MAPBOX_TOKEN };
