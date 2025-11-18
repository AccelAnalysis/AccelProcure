import OpenAI from 'openai';

let openAiInstance = null;

export const getOpenAiClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!openAiInstance) {
    openAiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORGANIZATION,
    });
  }

  return openAiInstance;
};

export default getOpenAiClient;
