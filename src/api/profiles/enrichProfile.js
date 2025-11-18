import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration for external APIs
const USA_SPENDING_API = 'https://api.usaspending.gov';
const SCC_API = 'https://api.sam.gov/entity-information/v3/entities';
const SCC_API_KEY = process.env.SAM_API_KEY; // Should be set in environment variables

/**
 * Fetches company data from USAspending.gov API
 */
async function fetchUSASpendingData(dunsNumber) {
  if (!dunsNumber) return null;
  
  try {
    const response = await axios.get(`${USA_SPENDING_API}/api/v2/recipient/children/${dunsNumber}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching USAspending data:', error.message);
    return null;
  }
}

/**
 * Fetches company data from System for Award Management (SAM) / SCC API
 */
async function fetchSCCData(ueiDuns) {
  if (!ueiDuns) return null;
  
  try {
    const response = await axios.get(`${SCC_API}`, {
      params: {
        api_key: SCC_API_KEY,
        ueiDUNS: ueiDuns,
        format: 'json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching SCC data:', error.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get the user's profile to find DUNS or UEI number
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('duns_number, uei_number')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Fetch data from both APIs in parallel
    const [usaSpendingData, sccData] = await Promise.all([
      fetchUSASpendingData(profile.duns_number),
      fetchSCCData(profile.uei_number || profile.duns_number)
    ]);

    // Prepare the enrichment data to be saved
    const enrichmentData = {
      last_enriched: new Date().toISOString(),
      enrichment_status: 'completed',
      enrichment_errors: []
    };

    // Process USAspending data if available
    if (usaSpendingData) {
      enrichmentData.usaspending_data = {
        total_obligations: usaSpendingData.amount,
        award_count: usaSpendingData.award_count,
        last_updated: new Date().toISOString()
      };
    } else {
      enrichmentData.enrichment_errors.push('Failed to fetch USAspending data');
    }

    // Process SCC data if available
    if (sccData) {
      enrichmentData.scc_data = {
        business_types: sccData.businessTypes,
        registration_status: sccData.registrationStatus,
        last_updated: new Date().toISOString()
      };
    } else {
      enrichmentData.enrichment_errors.push('Failed to fetch SCC data');
    }

    // Update the profile with enrichment data
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        enriched_data: enrichmentData,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating profile with enrichment data:', updateError);
      return res.status(500).json({ 
        error: 'Failed to save enrichment data',
        details: updateError.message 
      });
    }

    return res.status(200).json({
      message: 'Profile enriched successfully',
      profile: updatedProfile,
      enrichment_status: enrichmentData.enrichment_status,
      errors: enrichmentData.enrichment_errors.length > 0 ? 
        enrichmentData.enrichment_errors : undefined
    });
    
  } catch (error) {
    console.error('Server error during profile enrichment:', error);
    return res.status(500).json({ 
      error: 'Internal server error during profile enrichment',
      details: error.message 
    });
  }
}