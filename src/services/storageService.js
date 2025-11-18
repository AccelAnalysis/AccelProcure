import httpClient from './httpClient';

const STORAGE_BASE = '/storage';

export const uploadFile = (file, path, metadata = {}) => {
  if (!file) {
    throw new Error('File is required');
  }
  if (!path) {
    throw new Error('Storage path is required');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', path);
  formData.append('metadata', JSON.stringify(metadata));

  return httpClient.post(`${STORAGE_BASE}/upload`, formData);
};

export const deleteFile = (filePath) => {
  if (!filePath) {
    throw new Error('File path is required');
  }
  return httpClient.delete(`${STORAGE_BASE}/files`, { params: { path: filePath } });
};

export const listFiles = (path = '') =>
  httpClient.get(`${STORAGE_BASE}/files`, { params: { path } });

export const getSignedUrl = (filePath, expiresIn = 3600) => {
  if (!filePath) {
    throw new Error('File path is required');
  }
  return httpClient.get(`${STORAGE_BASE}/signed-url`, { params: { path: filePath, expiresIn } });
};

export const storageService = {
  uploadFile,
  deleteFile,
  listFiles,
  getSignedUrl
};

export default storageService;
