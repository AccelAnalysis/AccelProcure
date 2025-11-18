import httpClient from './httpClient';

const RFX_BASE = '/rfx';

const buildQuery = (filters = {}) =>
  Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );

export const getRfxList = (filters = {}) =>
  httpClient.get(RFX_BASE, { params: buildQuery(filters) });

export const getRfxById = (rfxId) => {
  if (!rfxId) {
    throw new Error('RFX ID is required');
  }
  return httpClient.get(`${RFX_BASE}/${rfxId}`);
};

export const createRfx = (payload) => {
  if (!payload) {
    throw new Error('RFX payload is required');
  }
  return httpClient.post(RFX_BASE, payload);
};

export const updateRfx = (rfxId, updates) => {
  if (!rfxId) {
    throw new Error('RFX ID is required');
  }
  if (!updates || Object.keys(updates).length === 0) {
    throw new Error('Updates are required');
  }
  return httpClient.put(`${RFX_BASE}/${rfxId}`, updates);
};

export const deleteRfx = (rfxId) => {
  if (!rfxId) {
    throw new Error('RFX ID is required');
  }
  return httpClient.delete(`${RFX_BASE}/${rfxId}`);
};

export const respondToRfx = (rfxId, responseData) => {
  if (!rfxId) {
    throw new Error('RFX ID is required');
  }
  if (!responseData) {
    throw new Error('Response data is required');
  }
  return httpClient.post(`${RFX_BASE}/${rfxId}/respond`, responseData);
};

export const rfxService = {
  getRfxList,
  getRfxById,
  createRfx,
  updateRfx,
  deleteRfx,
  respondToRfx
};

export default rfxService;
