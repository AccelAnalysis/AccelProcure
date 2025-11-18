// Application-wide configuration helpers and constants

const viteEnv = typeof import.meta !== 'undefined' ? import.meta.env ?? {} : {};
const nodeEnv = typeof process !== 'undefined' ? process?.env ?? {} : {};

const getEnvVar = (key, fallback) => {
  if (viteEnv && Object.prototype.hasOwnProperty.call(viteEnv, key) && viteEnv[key] !== undefined) {
    return viteEnv[key];
  }

  if (nodeEnv && Object.prototype.hasOwnProperty.call(nodeEnv, key) && nodeEnv[key] !== undefined) {
    return nodeEnv[key];
  }

  return fallback;
};

export const ENV_CONFIG = {
  MODE: getEnvVar('MODE', 'development'),
  APP_NAME: getEnvVar('VITE_APP_NAME', 'AccelRFx'),
  APP_ENV: getEnvVar('VITE_APP_ENV', 'development'),
  API_BASE_URL: getEnvVar('VITE_API_BASE_URL', 'http://localhost:3000/api'),
  MAPBOX_TOKEN: getEnvVar('VITE_MAPBOX_TOKEN'),
  SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL'),
  SUPABASE_ANON_KEY: getEnvVar('VITE_SUPABASE_ANON_KEY'),
  FIREBASE: {
    apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
    authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnvVar('VITE_FIREBASE_APP_ID'),
    measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID'),
  },
  OPENAI_API_KEY: getEnvVar('OPENAI_API_KEY'),
  OPENAI_ORGANIZATION: getEnvVar('OPENAI_ORGANIZATION'),
};

export const FEATURE_FLAGS = {
  ADVANCED_ANALYTICS: true,
  TEAM_COLLABORATION: false,
  OFFLINE_MODE: false,
  EXPORT_FUNCTIONS: true,
};

export const APP_CONFIG = {
  APP_NAME: ENV_CONFIG.APP_NAME,
  VERSION: viteEnv?.VITE_APP_VERSION || '1.0.0',
  API_BASE_URL: ENV_CONFIG.API_BASE_URL,
  API_TIMEOUT: 30_000,
  IS_DEVELOPMENT: viteEnv?.DEV ?? ENV_CONFIG.APP_ENV === 'development',
  IS_PRODUCTION: viteEnv?.PROD ?? ENV_CONFIG.APP_ENV === 'production',
  FEATURES: FEATURE_FLAGS,
  DEFAULT_PAGE_SIZE: 25,
  MAX_UPLOAD_SIZE: 50 * 1024 * 1024,
  CACHE_TTL: 3_600_000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

export const CREDIT_COSTS = {
  MAP_VIEW: 1,
  MAP_3D_VIEW: 2,
  MAP_ANALYSIS: 5,
  AI_PROPOSAL: 10,
  AI_RESPONSE: 15,
  AI_INSIGHT: 20,
  DOCUMENT_UPLOAD: 5,
  DOCUMENT_ANALYSIS: 10,
  ADMIN_OVERRIDE: 0,
};

export const RATE_LIMIT_MS = 1000;

export const API_BASE_URL = APP_CONFIG.API_BASE_URL;

export default APP_CONFIG;
