import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { AI_MODELS, DEFAULT_MODEL_SETTINGS, AI_RATE_LIMITS } from '../../config/ai.config.js';
import { rateLimiter } from '../../middleware/rateLimiter.js';
import { sanitizeInput } from '../../utils/security.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generates a response to an RFX question using AI
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const generateResponse = async (req, res) => {
  try {
    // Rate limiting check
    const rateLimit = await rateLimiter(req, res, AI_RATE_LIMITS);
    if (rateLimit.error) {
      return res.status(429).json({ 
        error: 'Too many requests', 
        message: rateLimit.message 
      });
    }

    const { 
      question, 
      rfxId, 
      vendorId, 
      context = '', 
      tone = 'professional',
      maxLength = 500
    } = req.body;

    // Input validation and sanitization
    if (!question || !rfxId || !vendorId) {
      return res.status(400).json({ 
        error: 'Question, RFX ID, and Vendor ID are required' 
      });
    }

    const sanitizedQuestion = sanitizeInput(question);
    const sanitizedRfxId = sanitizeInput(rfxId);
    const sanitizedVendorId = sanitizeInput(vendorId);
    const sanitizedContext = sanitizeInput(context);
    const sanitizedTone = ['professional', 'technical', 'concise', 'persuasive'].includes(tone) 
      ? tone 
      : 'professional';
    const sanitizedMaxLength = Math.min(parseInt(maxLength, 10), 2000) || 500;

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Fetch RFX and vendor data in parallel
    const [
      { data: rfx, error: rfxError },
      { data: vendor, error: vendorError },
      { data: pastResponses, error: responsesError }
    ] = await Promise.all([
      supabase
        .from('rfx_opportunities')
        .select('*')
        .eq('id', sanitizedRfxId)
        .single(),
      
      supabase
        .from('vendor_profiles')
        .select('*')
        .eq('id', sanitizedVendorId)
        .single(),
      
      // Get past similar questions and answers
      supabase
        .from('rfx_questions')
        .select('question, answer')
        .ilike('question', `%${sanitizedQuestion.split(' ').slice(0, 3).join(' ')}%`)
        .limit(3)
    ]);

    if (rfxError || !rfx) {
      return res.status(404).json({ error: 'RFX opportunity not found' });
    }

    if (vendorError || !vendor) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    // Prepare context for AI
    const aiContext = {
      rfx: {
        title: rfx.title,
        description: rfx.description,
        requirements: rfx.requirements
      },
      vendor: {
        company_name: vendor.company_name,
        capabilities: vendor.capabilities,
        certifications: vendor.certifications
      },
      question: sanitizedQuestion,
      additional_context: sanitizedContext,
      preferences: {
        tone: sanitizedTone,
        max_length: sanitizedMaxLength
      },
      past_responses: responsesError ? [] : (pastResponses || [])
    };

    // Generate AI prompt for response generation
    const systemPrompt = `You are an expert in responding to RFX questions for government contracts. 
      Generate a ${aiContext.preferences.tone} response to the question based on the RFX requirements 
      and the vendor's capabilities. The response should be clear, accurate, and tailored to 
      highlight the vendor's strengths while addressing the specific question.
      
      Guidelines:
      - Be precise and to the point
      - Reference specific requirements when applicable
      - Highlight relevant vendor capabilities and certifications
      - Maintain a ${aiContext.preferences.tone} tone
      - Keep the response under ${aiContext.preferences.max_length} characters`;

    const userPrompt = `RFX: ${aiContext.rfx.title}
      
      Question: ${aiContext.question}
      
      ${aiContext.additional_context ? `Additional Context: ${aiContext.additional_context}` : ''}
      
      Vendor: ${aiContext.vendor.company_name}
      Capabilities: ${aiContext.vendor.capabilities.join(', ')}
      Certifications: ${aiContext.vendor.certifications.join(', ')}
      
      ${aiContext.past_responses.length > 0 ? 
        'Past similar questions and answers for reference:\n' + 
        aiContext.past_responses.map(r => `Q: ${r.question}\nA: ${r.answer}`).join('\n\n') 
        : ''}
      
      Please provide a well-structured response to the question.`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: AI_MODELS.GPT_4,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: DEFAULT_MODEL_SETTINGS.temperature,
      max_tokens: Math.floor(sanitizedMaxLength / 4), // Rough estimate
      stop: ['\n\n', '\n\n\n']
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // Log the question and response (non-blocking)
    try {
      await supabase
        .from('rfx_questions')
        .insert([{
          rfx_id: sanitizedRfxId,
          vendor_id: sanitizedVendorId,
          question: sanitizedQuestion,
          answer: responseText,
          context: sanitizedContext,
          model_used: AI_MODELS.GPT_4,
          tokens_used: completion.usage?.total_tokens
        }]);
    } catch (logError) {
      console.error('Error logging question and response:', logError);
      // Non-critical error, continue
    }

    return res.json({
      success: true,
      response: responseText,
      model: AI_MODELS.GPT_4,
      tokens_used: completion.usage?.total_tokens
    });

  } catch (error) {
    console.error('Error in generateResponse:', error);
    return res.status(500).json({ 
      error: 'Failed to generate response',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default generateResponse;