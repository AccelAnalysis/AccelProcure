import { get } from './apiService';

const API_BASE = '/api/rfx';

/**
 * Fetch a list of RFPs with optional filters
 * @param {Object} filters - Optional filters for the RFP list
 * @returns {Promise<Array>} - List of RFPs
 */
export const getRfxList = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // Add filters to query params if provided
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    const url = `${API_BASE}?${queryParams.toString()}`;
    return await get(url);
  } catch (error) {
    console.error('Error fetching RFX list:', error);
    throw error;
  }
};

/**
 * Fetch a single RFP by ID
 * @param {string} rfxId - The ID of the RFP to fetch
 * @returns {Promise<Object>} - The RFP details
 */
export const getRfxById = async (rfxId) => {
  if (!rfxId) throw new Error('RFP ID is required');
  
  try {
    return await get(`${API_BASE}/${rfxId}`);
  } catch (error) {
    console.error(`Error fetching RFP ${rfxId}:`, error);
    throw error;
  }
};

/**
 * Create a new RFP
 * @param {Object} rfxData - The RFP data to create
 * @returns {Promise<Object>} - The created RFP
 */
export const createRfx = async (rfxData) => {
  if (!rfxData) throw new Error('RFP data is required');
  
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rfxData),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create RFP');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating RFP:', error);
    throw error;
  }
};

/**
 * Update an existing RFP
 * @param {string} rfxId - The ID of the RFP to update
 * @param {Object} updates - The updates to apply to the RFP
 * @returns {Promise<Object>} - The updated RFP
 */
export const updateRfx = async (rfxId, updates) => {
  if (!rfxId) throw new Error('RFP ID is required');
  if (!updates || Object.keys(updates).length === 0) {
    throw new Error('No updates provided');
  }
  
  try {
    const response = await fetch(`${API_BASE}/${rfxId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update RFP');
    }

    return await response.json();
  } catch (error) {
    console.error(`Error updating RFP ${rfxId}:`, error);
    throw error;
  }
};

/**
 * Delete an RFP
 * @param {string} rfxId - The ID of the RFP to delete
 * @returns {Promise<Object>} - Confirmation of deletion
 */
export const deleteRfx = async (rfxId) => {
  if (!rfxId) throw new Error('RFP ID is required');
  
  try {
    const response = await fetch(`${API_BASE}/${rfxId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete RFP');
    }

    return await response.json();
  } catch (error) {
    console.error(`Error deleting RFP ${rfxId}:`, error);
    throw error;
  }
};

/**
 * Submit a response to an RFP
 * @param {string} rfxId - The ID of the RFP to respond to
 * @param {Object} responseData - The response data
 * @returns {Promise<Object>} - The created response
 */
export const respondToRfx = async (rfxId, responseData) => {
  if (!rfxId) throw new Error('RFP ID is required');
  if (!responseData) throw new Error('Response data is required');
  
  try {
    const response = await fetch(`${API_BASE}/${rfxId}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(responseData),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit RFP response');
    }

    return await response.json();
  } catch (error) {
    console.error(`Error responding to RFP ${rfxId}:`, error);
    throw error;
  }
};
