/**
 * AI Service for handling all AI-related API calls
 */

/**
 * Generate a proposal for an RFX using AI
 * @param {string} rfxId - The ID of the RFX to generate a proposal for
 * @param {Object} context - Additional context for the AI
 * @returns {Promise<Object>} - Generated proposal data
 */
export const generateProposal = async (rfxId, context = {}) => {
  try {
    const response = await fetch('/api/ai/generate-proposal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({ rfxId, ...context })
    });

    if (!response.ok) {
      throw new Error(`Error generating proposal: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in generateProposal:', error);
    throw error;
  }
};

/**
 * Generate a response to an RFX using AI
 * @param {string} rfxId - The ID of the RFX to respond to
 * @param {Object} vendorContext - Vendor-specific context for the response
 * @returns {Promise<Object>} - Generated response data
 */
export const generateResponse = async (rfxId, vendorContext = {}) => {
  try {
    const response = await fetch('/api/ai/generate-response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({ rfxId, ...vendorContext })
    });

    if (!response.ok) {
      throw new Error(`Error generating response: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in generateResponse:', error);
    throw error;
  }
};

/**
 * Get AI-suggested matches for an RFX
 * @param {string} rfxId - The ID of the RFX to get matches for
 * @param {Object} filters - Optional filters for the matching
 * @returns {Promise<Array>} - Array of suggested matches
 */
export const suggestMatches = async (rfxId, filters = {}) => {
  try {
    const queryParams = new URLSearchParams({
      rfxId,
      ...filters
    });

    const response = await fetch(`/api/ai/suggest-matches?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error getting suggested matches: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in suggestMatches:', error);
    throw error;
  }
};

/**
 * Get AI analysis for a specific RFX
 * @param {string} rfxId - The ID of the RFX to analyze
 * @returns {Promise<Object>} - AI analysis results
 */
export const getRfxAnalysis = async (rfxId) => {
  try {
    const response = await fetch(`/api/ai/analyze-rfx/${rfxId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error getting RFX analysis: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in getRfxAnalysis:', error);
    throw error;
  }
};

/**
 * Get AI-powered market insights for a specific industry or NAICS code
 * @param {string} industryCode - NAICS code or industry identifier
 * @returns {Promise<Object>} - Market insights data
 */
export const getMarketInsights = async (industryCode) => {
  try {
    const response = await fetch(`/api/ai/market-insights/${industryCode}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error getting market insights: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in getMarketInsights:', error);
    throw error;
  }
};

export default {
  generateProposal,
  generateResponse,
  suggestMatches,
  getRfxAnalysis,
  getMarketInsights
};