/**
 * API Configuration
 * 
 * This file provides the base URL for API calls.
 * 
 * In development: Uses Vite's proxy (/api routes automatically forward to backend)
 * In production: this file uses the fixed Render backend URL
 */

// Base URL for API requests (fixed Render deployment)
// In development, we use relative URLs because Vite proxy handles forwarding
// In production, use the full backend URL
export const API_BASE_URL = 'https://ecsc-challenge-trophy-backend.onrender.com';

// Check if we're in development mode with Vite proxy (defensive check)
export const USE_PROXY = typeof import.meta !== 'undefined' && import.meta.env && Boolean(import.meta.env.DEV);

/**
 * Get the full API endpoint URL
 * @param {string} path - API path (e.g., '/api/teams')
 * @returns {string} Full URL or relative path depending on environment
 */
export const getApiUrl = (path) => {
  // In development with Vite proxy, use relative paths
  if (USE_PROXY) {
    return path;
  }
  // In production, prepend the base URL
  return `${API_BASE_URL}${path}`;
};

export default {
  API_BASE_URL,
  USE_PROXY,
  getApiUrl
};
