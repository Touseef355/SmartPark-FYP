import axios from "axios";

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API = axios.create({
  baseURL: `${apiBase.replace(/\/$/, '')}/api/`,
});

// Automatically add token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;