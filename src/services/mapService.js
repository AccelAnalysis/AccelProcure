import httpClient from './httpClient';

const MAP_BASE = '/map';

const normalizeFilters = (filters = {}) =>
  Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );

export const getMapLayers = (filters = {}) =>
  httpClient.get(`${MAP_BASE}/layers`, { params: normalizeFilters(filters) });

export const get3DTerrainData = (bounds, options = {}) => {
  if (!bounds) {
    throw new Error('Map bounds are required');
  }

  return httpClient.post(`${MAP_BASE}/terrain`, { bounds, ...options });
};

export const mapService = {
  getMapLayers,
  get3DTerrainData
};

export default mapService;
