import httpClient from './httpClient';

const PROFILE_BASE = '/profiles';

export const getProfile = () => httpClient.get(`${PROFILE_BASE}/me`);

export const updateProfile = (updates = {}) => {
  if (!updates || Object.keys(updates).length === 0) {
    throw new Error('Profile updates are required');
  }
  return httpClient.put(`${PROFILE_BASE}/me`, updates);
};

export const enrichProfile = (options = {}) => httpClient.post(`${PROFILE_BASE}/enrich`, options);

export const profileService = {
  getProfile,
  updateProfile,
  enrichProfile
};

export default profileService;
