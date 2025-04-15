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

// Authentication
export const getGoogleAuthUrl = () => api.get('/auth/url');

// Google Drive Files (no need to pass access token now, backend will handle it)
export const listDriveFiles = () => api.get('/googledrive/files');
export const processFile = (fileId: string) => api.get(`/googledrive/process/${fileId}`);
// export const scanDocuments = (googleToken?: string) => {
//   const headers = googleToken ? { 'Google-Auth': googleToken } : {};
//   return api.post('/googledrive/scan', {}, { headers });
// }

export const scanDocuments = () => api.post('/googledrive/scan');

// Assets
export const getDetectedAssets = () => api.get('/assets/detected');
export const getStaticAssets = () => api.get('/assets/static');
export const getMissingAssets = () => api.get('/assets/missing');
export const saveMissingAsset = (assetData: any, googleToken?: string) => {
  const config = googleToken ? { headers: { 'Google-Auth': googleToken } } : undefined;
  return api.post('/assets/add-missing', assetData, config);
};

export default api;