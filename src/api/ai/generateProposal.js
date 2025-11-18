import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { AI_MODELS, DEFAULT_MODEL_SETTINGS, AI_RATE_LIMITS } from '../../config/ai.config.js';
import { rateLimiter } from '../../middleware/rateLimiter.js';
import { sanitizeInput } from '../../utils/security.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generates a proposal for an RFX opportunity using AI
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const generateProposal = async (req, res) => {
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
      rfxId, 
      vendorId, 
      tone = 'professional',
      length = 'comprehensive',
      customInstructions = ''
    } = req.body;

    // Input validation and sanitization
    if (!rfxId || !vendorId) {
      return res.status(400).json({ 
        error: 'RFX ID and Vendor ID are required' 
      });
    }

    const sanitizedRfxId = sanitizeInput(rfxId);
    const sanitizedVendorId = sanitizeInput(vendorId);
    const sanitizedTone = ['professional', 'persuasive', 'technical', 'concise'].includes(tone) 
      ? tone 
      : 'professional';
    const sanitizedLength = ['brief', 'standard', 'comprehensive', 'detailed'].includes(length)
      ? length
      : 'comprehensive';

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Fetch RFX details
    const { data: rfx, error: rfxError } = await supabase
      .from('rfx_opportunities')
      .select('*')
      .eq('id', sanitizedRfxId)
      .single();

    if (rfxError || !rfx) {
      return res.status(404).json({ error: 'RFX opportunity not found' });
    }

    // Fetch vendor profile
    const { data: vendor, error: vendorError } = await supabase
      .from('vendor_profiles')
      .select('*')
      .eq('id', sanitizedVendorId)
      .single();

    if (vendorError || !vendor) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    // Fetch past performance data if available
    const { data: pastPerformance } = await supabase
      .from('vendor_past_performance')
      .select('*')
      .eq('vendor_id', sanitizedVendorId)
      .order('completion_date', { ascending: false })
      .limit(3);

    // Prepare context for AI
    const context = {
      rfx: {
        title: rfx.title,
        description: rfx.description,
        requirements: rfx.requirements,
        evaluation_criteria: rfx.evaluation_criteria,
        submission_deadline: rfx.submission_deadline,
        budget_range: rfx.budget_range
      },
      vendor: {
        company_name: vendor.company_name,
        capabilities: vendor.capabilities,
        certifications: vendor.certifications,
        differentiators: vendor.differentiators,
        past_performance: pastPerformance || []
      },
      preferences: {
        tone: sanitizedTone,
        length: sanitizedLength,
        custom_instructions: customInstructions
      }
    };

    // Generate AI prompt for proposal generation
    const systemPrompt = `You are an expert proposal writer for government contracts. 
      Generate a ${context.preferences.length} proposal in a ${context.preferences.tone} tone 
      that addresses all RFX requirements while highlighting the vendor's strengths.
      
      Focus on:
      - Clear value proposition
      - Compliance with requirements
      - Competitive differentiators
      - Relevant past performance
      - Clear pricing structure
      
      Format the response as a well-structured proposal with appropriate sections.`;

    const userPrompt = `Generate a proposal for the following RFX:
      
      RFX Title: ${context.rfx.title}
      Description: ${context.rfx.description}
      Requirements: ${JSON.stringify(context.rfx.requirements, null, 2)}
      
      Vendor: ${context.vendor.company_name}
      Capabilities: ${context.vendor.capabilities.join(', ')}
      Certifications: ${context.vendor.certifications.join(', ')}
      
      ${context.preferences.custom_instructions ? `Custom Instructions: ${context.preferences.custom_instructions}` : ''}
      
      Please provide a comprehensive proposal that addresses all RFX requirements.`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: AI_MODELS.GPT_4,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: DEFAULT_MODEL_SETTINGS.temperature,
      max_tokens: 3000
    });

    const proposalContent = completion.choices[0]?.message?.content || '';

    // Save the generated proposal (non-blocking)
    try {
      const { error: saveError } = await supabase
        .from('proposals')
        .insert([{
          rfx_id: sanitizedRfxId,
          vendor_id: sanitizedVendorId,
          content: proposalContent,
          status: 'draft',
          model_used: AI_MODELS.GPT_4,
          tokens_used: completion.usage?.total_tokens
        }]);

      if (saveError) {
        console.error('Error saving proposal:', saveError);
      }
    } catch (saveError) {
      console.error('Error in proposal save operation:', saveError);
    }

    return res.json({
      success: true,
      proposal: proposalContent,
      model: AI_MODELS.GPT_4,
      tokens_used: completion.usage?.total_tokens
    });

  } catch (error) {
    console.error('Error in generateProposal:', error);
    return res.status(500).json({ 
      error: 'Failed to generate proposal',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default generateProposal;