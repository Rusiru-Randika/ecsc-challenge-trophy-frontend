/**
 * API Configuration
 * 
 * This file provides the base URL for API calls.
 * 
 * In development: Uses Vite's proxy (/api routes automatically forward to backend)
 * In production: You can configure VITE_API_URL to point to your backend server
 */

// Base URL for API requests
// In development, we use relative URLs because Vite proxy handles forwarding
// In production, use the full backend URL from environment variable
export const API_BASE_URL = import.meta.env.VITE_API_URL;

// Check if we're in development mode with Vite proxy
export const USE_PROXY = import.meta.env.DEV;

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
