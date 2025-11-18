// AI Configuration - Server-side only
// This file contains AI model configurations and API settings

// Model configurations
export const AI_MODELS = {
  // Text generation models
  GPT_4: 'gpt-4-1106-preview',
  GPT_3_5_TURBO: 'gpt-3.5-turbo-1106',
  
  // Embedding models
  EMBEDDING_V3_SMALL: 'text-embedding-3-small',
  EMBEDDING_V3_LARGE: 'text-embedding-3-large'
};

// API endpoints
export const AI_API_ENDPOINTS = {
  CHAT_COMPLETIONS: 'https://api.openai.com/v1/chat/completions',
  EMBEDDINGS: 'https://api.openai.com/v1/embeddings',
  MODERATION: 'https://api.openai.com/v1/moderations'
};

// Rate limiting and usage tracking
export const AI_RATE_LIMITS = {
  REQUESTS_PER_MINUTE: 60,
  TOKENS_PER_MINUTE: 60000,
  EMBEDDING_BATCH_SIZE: 50
};

// Default model settings
export const DEFAULT_MODEL_SETTINGS = {
  temperature: 0.7,
  max_tokens: 1000,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
};

// Cost per 1K tokens (in USD)
export const AI_COSTS = {
  [AI_MODELS.GPT_4]: 0.03, // $0.03 per 1K tokens
  [AI_MODELS.GPT_3_5_TURBO]: 0.0015, // $0.0015 per 1K tokens
  [AI_MODELS.EMBEDDING_V3_SMALL]: 0.00002, // $0.02 per 1M tokens
  [AI_MODELS.EMBEDDING_V3_LARGE]: 0.00013, // $0.13 per 1M tokens
};

// Export default configuration
export default {
  models: AI_MODELS,
  endpoints: AI_API_ENDPOINTS,
  limits: AI_RATE_LIMITS,
  defaultSettings: DEFAULT_MODEL_SETTINGS,
  costs: AI_COSTS
};

// Note: This file should only be used on the server-side
// to prevent exposing sensitive information to the client.