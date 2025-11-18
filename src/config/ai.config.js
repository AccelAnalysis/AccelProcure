import { ENV_CONFIG } from './app.config';

export const AI_MODELS = {
  GPT_4: 'gpt-4-1106-preview',
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_3_5_TURBO: 'gpt-3.5-turbo-1106',
  EMBEDDING_V3_SMALL: 'text-embedding-3-small',
  EMBEDDING_V3_LARGE: 'text-embedding-3-large',
};

export const AI_API_ENDPOINTS = {
  CHAT_COMPLETIONS: 'https://api.openai.com/v1/chat/completions',
  EMBEDDINGS: 'https://api.openai.com/v1/embeddings',
  MODERATION: 'https://api.openai.com/v1/moderations',
};

export const AI_RATE_LIMITS = {
  REQUESTS_PER_MINUTE: 60,
  TOKENS_PER_MINUTE: 60_000,
  EMBEDDING_BATCH_SIZE: 50,
};

export const DEFAULT_MODEL_SETTINGS = {
  temperature: 0.7,
  max_tokens: 1000,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
};

export const AI_PROVIDER_KEYS = {
  apiKey: ENV_CONFIG.OPENAI_API_KEY,
  organization: ENV_CONFIG.OPENAI_ORGANIZATION,
};

export const AI_COSTS = {
  [AI_MODELS.GPT_4]: 0.03,
  [AI_MODELS.GPT_4O_MINI]: 0.002,
  [AI_MODELS.GPT_3_5_TURBO]: 0.0015,
  [AI_MODELS.EMBEDDING_V3_SMALL]: 0.00002,
  [AI_MODELS.EMBEDDING_V3_LARGE]: 0.00013,
};

export const createOpenAIClient = async () => {
  if (typeof window !== 'undefined') {
    throw new Error('OpenAI client should only be initialized on the server.');
  }

  if (!AI_PROVIDER_KEYS.apiKey) {
    throw new Error('OPENAI_API_KEY is not set.');
  }

  const { default: OpenAI } = await import('openai');
  return new OpenAI({
    apiKey: AI_PROVIDER_KEYS.apiKey,
    organization: AI_PROVIDER_KEYS.organization || undefined,
  });
};

export default {
  models: AI_MODELS,
  endpoints: AI_API_ENDPOINTS,
  limits: AI_RATE_LIMITS,
  defaultSettings: DEFAULT_MODEL_SETTINGS,
  costs: AI_COSTS,
  keys: AI_PROVIDER_KEYS,
};
