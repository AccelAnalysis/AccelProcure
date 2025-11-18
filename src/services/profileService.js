import httpClient from './httpClient';

const PROFILE_BASE = '/profiles';

export const getProfile = () => httpClient.get(`${PROFILE_BASE}/me`);

export const updateProfile = (updates = {}) => {
  if (!updates || Object.keys(updates).length === 0) {
    throw new Error('Profile updates are required');
  }
  return httpClient.put(`${PROFILE_BASE}/me`, updates);
};

export const enrichProfile = (profileId, options = {}) => {
  if (!profileId) {
    throw new Error('Profile ID is required');
  }
  return httpClient.post(`${PROFILE_BASE}/${profileId}/enrich`, options);
};

export const profileService = {
  getProfile,
  updateProfile,
  enrichProfile
};

export default profileService;
