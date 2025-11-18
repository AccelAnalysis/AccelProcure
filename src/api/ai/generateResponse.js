import { getOpenAiClient } from '../utils/openaiClient.js';

const buildPrompt = ({ question, context }) => `You are a procurement assistant.\n\nContext: ${context || 'Not provided'}\n\nQuestion: ${
  question
}\nProvide a concise and actionable answer.`;

export const generateResponseHandler = async (req, res) => {
  const { question, context } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  try {
    const openai = getOpenAiClient();
    if (!openai) {
      return res.status(200).json({
        answer: `Unable to contact AI provider. Here's a best-effort summary: ${question.slice(0, 120)}...`,
        provider: 'fallback',
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'You are a helpful assistant for government contracting teams.' },
        { role: 'user', content: buildPrompt({ question, context }) },
      ],
    });

    const answer = completion.choices?.[0]?.message?.content;

    return res.status(200).json({ answer, provider: 'openai' });
  } catch (error) {
    console.error('Generate response error:', error);
    return res.status(500).json({ error: 'Unable to generate AI response' });
  }
};

export default generateResponseHandler;
