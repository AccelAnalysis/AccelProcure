import httpClient from './httpClient';

const AI_BASE = '/ai';

export const generateProposal = (rfxId, context = {}) => {
  if (!rfxId) {
    throw new Error('RFX ID is required');
  }
  return httpClient.post(`${AI_BASE}/proposals`, { rfxId, ...context });
};

export const generateResponse = (rfxId, vendorContext = {}) => {
  if (!rfxId) {
    throw new Error('RFX ID is required');
  }
  return httpClient.post(`${AI_BASE}/responses`, { rfxId, ...vendorContext });
};

export const suggestMatches = (rfxId, filters = {}) => {
  if (!rfxId) {
    throw new Error('RFX ID is required');
  }
  return httpClient.get(`${AI_BASE}/matches`, { params: { rfxId, ...filters } });
};

export const getRfxAnalysis = (rfxId) => {
  if (!rfxId) {
    throw new Error('RFX ID is required');
  }
  return httpClient.get(`${AI_BASE}/rfx/${rfxId}`);
};

export const getMarketInsights = (industryCode) => {
  if (!industryCode) {
    throw new Error('Industry code is required');
  }
  return httpClient.get(`${AI_BASE}/insights/${encodeURIComponent(industryCode)}`);
};

export const aiService = {
  generateProposal,
  generateResponse,
  suggestMatches,
  getRfxAnalysis,
  getMarketInsights
};

export default aiService;
