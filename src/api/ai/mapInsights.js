import { getSupabaseClient } from '../utils/supabaseClient.js';
import { getOpenAiClient } from '../utils/openaiClient.js';

export const mapInsightsHandler = async (req, res) => {
  const supabase = getSupabaseClient();
  const { region } = req.query;

  try {
    const { data: layers, error } = await supabase
      .from('map_layers')
      .select('*')
      .maybeSingle();

    if (error) {
      return res.status(400).json({ error: 'Unable to load map data', details: error.message });
    }

    const openai = getOpenAiClient();
    const insightContext = {
      region: region || 'global',
      stats: layers?.statistics || {},
      hotSpots: layers?.hotspots || [],
    };

    if (!openai) {
      return res.status(200).json({
        summary: `Region ${insightContext.region} currently has ${insightContext.hotSpots.length} hot spots tracked.`,
        provider: 'fallback',
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: 'You provide short summaries of geospatial activity for procurement teams.',
        },
        {
          role: 'user',
          content: `Summarize procurement-relevant signals for region ${insightContext.region} using this data: ${JSON.stringify(
            insightContext,
          )}. Limit to 3 bullet points.`,
        },
      ],
    });

    return res.status(200).json({ summary: completion.choices?.[0]?.message?.content, provider: 'openai' });
  } catch (error) {
    console.error('Map insights error:', error);
    return res.status(500).json({ error: 'Unable to generate map insights' });
  }
};

export default mapInsightsHandler;
