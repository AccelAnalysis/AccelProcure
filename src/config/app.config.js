// Application Configuration Constants
export const APP_CONFIG = {
  // Application Information
  APP_NAME: 'AccelRFx',
  VERSION: '1.0.0',
  
  // API Configuration
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  API_TIMEOUT: 30000, // 30 seconds
  
  // Environment Flags
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
  
  // Feature Toggles
  FEATURES: {
    ADVANCED_ANALYTICS: true,
    TEAM_COLLABORATION: false,
    OFFLINE_MODE: false,
    EXPORT_FUNCTIONS: true
  },
  
  // UI Constants
  DEFAULT_PAGE_SIZE: 25,
  MAX_UPLOAD_SIZE: 50 * 1024 * 1024, // 50MB
  
  // Cache Settings
  CACHE_TTL: 3600000, // 1 hour in milliseconds
  
  // Error Handling
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Credit System Configuration
export const CREDIT_COSTS = {
  // Map Operations
  MAP_VIEW: 1,
  MAP_3D_VIEW: 2,
  MAP_ANALYSIS: 5,
  
  // AI Features
  AI_PROPOSAL: 10,
  AI_RESPONSE: 15,
  AI_INSIGHT: 20,
  
  // Document Processing
  DOCUMENT_UPLOAD: 5,
  DOCUMENT_ANALYSIS: 10,
  
  // Admin Operations
  ADMIN_OVERRIDE: 0, // No cost for admin operations
};

// Rate limiting (in milliseconds)
export const RATE_LIMIT_MS = 1000; // 1 second between identical actions

// Default export for backward compatibility
export default APP_CONFIG;