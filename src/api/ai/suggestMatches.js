import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { AI_MODELS, AI_API_ENDPOINTS, AI_RATE_LIMITS, DEFAULT_MODEL_SETTINGS } from '../../config/ai.config.js';
import { rateLimiter } from '../../middleware/rateLimiter.js';
import { sanitizeInput } from '../../utils/security.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Suggests potential vendor matches for an RFX opportunity using AI
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const suggestMatches = async (req, res) => {
  try {
    // Rate limiting check
    const rateLimit = await rateLimiter(req, res, AI_RATE_LIMITS);
    if (rateLimit.error) {
      return res.status(429).json({ 
        error: 'Too many requests', 
        message: rateLimit.message 
      });
    }

    const { rfxId, limit = 5 } = req.body;
    
    // Input validation and sanitization
    if (!rfxId) {
      return res.status(400).json({ error: 'RFX ID is required' });
    }

    const sanitizedRfxId = sanitizeInput(rfxId);
    const sanitizedLimit = Math.min(parseInt(limit, 10), 10) || 5; // Max 10 suggestions

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

    // Fetch potential vendors (filter by NAICS codes if available)
    let query = supabase
      .from('vendor_profiles')
      .select('*')
      .limit(50); // Initial filter to get a manageable set

    if (rfx.naics_codes && rfx.naics_codes.length > 0) {
      query = query.overlaps('naics_codes', rfx.naics_codes);
    }

    const { data: vendors, error: vendorsError } = await query;

    if (vendorsError) {
      console.error('Error fetching vendors:', vendorsError);
      return res.status(500).json({ error: 'Error fetching vendor data' });
    }

    if (!vendors || vendors.length === 0) {
      return res.json({ matches: [], message: 'No vendors found for matching' });
    }

    // Prepare context for AI
    const vendorContext = vendors.map(vendor => ({
      id: vendor.id,
      name: vendor.company_name,
      capabilities: vendor.capabilities,
      past_performance: vendor.past_performance_summary,
      certifications: vendor.certifications
    }));

    // Generate AI prompt for matching
    const prompt = `Given the following RFX opportunity and list of vendors, 
      rank and return the top ${sanitizedLimit} best matches with a confidence score (0-1) and brief reasoning:
      
      RFX: ${rfx.title}
      Description: ${rfx.description}
      Requirements: ${rfx.requirements}
      
      Vendors: ${JSON.stringify(vendorContext, null, 2)}
      
      Return a JSON array of objects with: vendorId, matchScore, and reasoning.`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: AI_MODELS.GPT_4,
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert government contracting assistant. Analyze RFX opportunities and vendor profiles to find the best matches.' 
        },
        { 
          role: 'user', 
          content: prompt 
        }
      ],
      temperature: DEFAULT_MODEL_SETTINGS.temperature,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    // Parse and validate AI response
    let matches = [];
    try {
      const responseContent = completion.choices[0]?.message?.content;
      const parsedResponse = JSON.parse(responseContent);
      
      // Handle different possible response structures
      if (Array.isArray(parsedResponse)) {
        matches = parsedResponse;
      } else if (parsedResponse.matches) {
        matches = parsedResponse.matches;
      } else if (typeof parsedResponse === 'object') {
        matches = Object.values(parsedResponse);
      }
      
      // Ensure we have valid matches
      if (!Array.isArray(matches) || matches.length === 0) {
        throw new Error('Invalid match format from AI');
      }
      
      // Sort by match score (highest first) and limit results
      matches = matches
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
        .slice(0, sanitizedLimit);
      
      // Add vendor details to matches
      const enhancedMatches = matches.map(match => {
        const vendor = vendors.find(v => v.id === match.vendorId || v.id === match.id);
        return {
          vendorId: match.vendorId || match.id,
          matchScore: match.matchScore || 0,
          reasoning: match.reasoning || 'No reasoning provided',
          vendorName: vendor?.company_name || 'Unknown',
          vendorCapabilities: vendor?.capabilities || [],
          vendorCertifications: vendor?.certifications || []
        };
      });

      // Log the match for analytics (non-blocking)
      try {
        await supabase
          .from('ai_match_logs')
          .insert([{
            rfx_id: sanitizedRfxId,
            matches: enhancedMatches,
            model_used: AI_MODELS.GPT_4,
            input_tokens: completion.usage?.prompt_tokens,
            output_tokens: completion.usage?.completion_tokens
          }]);
      } catch (logError) {
        console.error('Error logging match results:', logError);
        // Non-critical error, continue
      }

      return res.json({
        success: true,
        matches: enhancedMatches,
        model: AI_MODELS.GPT_4,
        tokens_used: completion.usage?.total_tokens
      });

    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return res.status(500).json({ 
        error: 'Error processing match results',
        details: parseError.message 
      });
    }

  } catch (error) {
    console.error('Error in suggestMatches:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default suggestMatches;