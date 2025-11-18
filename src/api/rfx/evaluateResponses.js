import { getSupabaseClient } from '../utils/supabaseClient.js';

const calculateScore = (response) => {
  let score = 0;
  if (response.bid_amount) {
    score += 30 / Math.max(response.bid_amount, 1);
  }
  if (response.content) {
    score += Math.min(response.content.length / 100, 40);
  }
  if (response.availability === 'immediate') {
    score += 15;
  }
  return Number(score.toFixed(2));
};

export const evaluateResponsesHandler = async (req, res) => {
  const supabase = getSupabaseClient();
  const { rfxId } = req.params;

  try {
    const { data: responses, error } = await supabase
      .from('rfx_responses')
      .select('*')
      .eq('rfx_id', rfxId);

    if (error) {
      return res.status(400).json({ error: 'Unable to load responses', details: error.message });
    }

    const scored = (responses || []).map((response) => ({
      ...response,
      evaluation_score: calculateScore(response),
    }));

    for (const response of scored) {
      await supabase
        .from('rfx_responses')
        .update({ evaluation_score: response.evaluation_score })
        .eq('id', response.id);
    }

    return res.status(200).json({ responses: scored });
  } catch (error) {
    console.error('Evaluate responses error:', error);
    return res.status(500).json({ error: 'Unable to evaluate responses' });
  }
};

export default evaluateResponsesHandler;
