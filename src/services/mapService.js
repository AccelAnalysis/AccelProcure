import httpClient from './httpClient';

const MAP_BASE = '/map';

const normalizeFilters = (filters = {}) =>
  Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );

export const getMapLayers = (filters = {}) =>
  httpClient.get(MAP_BASE, { params: normalizeFilters(filters) });

const serializeBounds = (bounds = {}) => {
  if (!bounds || typeof bounds !== 'object') {
    throw new Error('Map bounds are required');
  }

  const { west, south, east, north } = bounds;
  const parts = [west, south, east, north];
  if (parts.some((value) => typeof value !== 'number')) {
    throw new Error('Bounds must include numeric west, south, east, and north values');
  }

  return parts.join(',');
};

export const get3DTerrainData = (bounds, options = {}) => {
  if (!bounds) {
    throw new Error('Map bounds are required');
  }

  return httpClient.get(`${MAP_BASE}/terrain`, {
    params: {
      bbox: serializeBounds(bounds),
      ...normalizeFilters(options),
    },
  });
};

export const mapService = {
  getMapLayers,
  get3DTerrainData
};

export default mapService;
