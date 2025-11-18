import axios from 'axios';
import { getSupabaseClient } from '../utils/supabaseClient.js';

const usaSpendingClient = axios.create({ baseURL: 'https://api.usaspending.gov/api/v2' });
const samGovClient = axios.create({ baseURL: 'https://api.sam.gov/entity-information/v3' });

const fetchUsaSpending = async (dunsNumber) => {
  if (!dunsNumber) return null;
  try {
    const { data } = await usaSpendingClient.get(`/recipient/children/${dunsNumber}/`);
    return data;
  } catch (error) {
    console.warn('USAspending lookup failed:', error.message);
    return null;
  }
};

const fetchSamRecord = async (uei, apiKey) => {
  if (!uei || !apiKey) return null;
  try {
    const { data } = await samGovClient.get('/entities', {
      params: { ueiSAM: uei, api_key: apiKey, format: 'json' },
    });
    return data;
  } catch (error) {
    console.warn('SAM.gov lookup failed:', error.message);
    return null;
  }
};

export const enrichProfileHandler = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, duns_number, uei_number, enriched_data')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const [usaSpending, samRecord] = await Promise.all([
      fetchUsaSpending(profile.duns_number),
      fetchSamRecord(profile.uei_number || profile.duns_number, process.env.SAM_API_KEY),
    ]);

    const enrichment = {
      last_enriched_at: new Date().toISOString(),
      sources: {
        usaspending: Boolean(usaSpending),
        sam: Boolean(samRecord),
      },
      data: {
        obligations: usaSpending?.amount || 0,
        award_count: usaSpending?.award_count || 0,
        sam_registration_status: samRecord?.entityRegistrations?.[0]?.registrationStatus,
      },
    };

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ enriched_data: enrichment, updated_at: enrichment.last_enriched_at })
      .eq('id', req.user.id)
      .select('*')
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to persist enrichment', details: updateError.message });
    }

    return res.status(200).json({ message: 'Profile enriched', profile: updatedProfile });
  } catch (error) {
    console.error('Enrich profile error:', error);
    return res.status(500).json({ error: 'Unable to enrich profile' });
  }
};

export default enrichProfileHandler;
