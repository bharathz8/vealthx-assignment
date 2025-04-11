import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Set auth token for all requests if available
api.interceptors.request.use(config => {
  // Get token from localStorage
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// Google Drive Files
export const listDriveFiles = (accessToken?: string) => {
  const headers = accessToken ? { 'X-Google-Token': accessToken } : {};
  return api.get('/googledrive/files', { headers });
};

export const processFile = (fileId: string, accessToken?: string) => {
  const headers = accessToken ? { 'X-Google-Token': accessToken } : {};
  return api.get(`/googledrive/process/${fileId}`, { headers });
};

export const scanDocuments = (accessToken?: string) => {
  const headers = accessToken ? { 'X-Google-Token': accessToken } : {};
  return api.post('/googledrive/scan', {}, { headers });
};

// Assets
export const getDetectedAssets = () => api.get('/assets/detected');
export const getStaticAssets = () => api.get('/assets/static');
export const getMissingAssets = () => api.get('/assets');
export const saveMissingAsset = (assetData: any, accessToken?: string) => {
  const headers = accessToken ? { 'X-Google-Token': accessToken } : {};
  return api.post('/assets/add-missing', assetData, { headers });
};

export default api;