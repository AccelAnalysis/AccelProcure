import { supabase } from '../config/supabaseClient';
import { API_BASE_URL } from '../config/app.config';

/**
 * Fetches the current user's profile
 * @returns {Promise<Object>} User profile data
 */
export const getProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
};

/**
 * Updates the current user's profile
 * @param {Object} updates - Profile fields to update
 * @returns {Promise<Object>} Updated profile data
 */
export const updateProfile = async (updates) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

/**
 * Enriches profile data with additional information from external sources
 * @param {string} profileId - ID of the profile to enrich
 * @returns {Promise<Object>} Enriched profile data
 */
export const enrichProfile = async (profileId) => {
  try {
    // First get the base profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (profileError) throw profileError;

    // If no DUNS number, return basic profile
    if (!profile.duns_number) {
      console.warn('No DUNS number found for profile enrichment');
      return profile;
    }

    // Fetch additional data from USAspending.gov API
    const usaspendingResponse = await fetch(
      `https://api.usaspending.gov/api/v2/recipient/duns/${profile.duns_number}/`
    );
    
    if (!usaspendingResponse.ok) {
      throw new Error('Failed to fetch data from USAspending API');
    }

    const usaspendingData = await usaspendingResponse.json();

    // Update profile with enriched data
    const enrichedProfile = {
      ...profile,
      business_categories: usaspendingData.business_categories || [],
      business_types: usaspendingData.business_types || [],
      last_12_months: usaspendingData.last_12_months || {},
      recipient_level: usaspendingData.recipient_level,
      update_date: new Date().toISOString()
    };

    // Save enriched data back to the database
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(enrichedProfile)
      .eq('id', profileId)
      .select()
      .single();

    if (updateError) throw updateError;
    
    return updatedProfile;
  } catch (error) {
    console.error('Error enriching profile:', error);
    throw error;
  }
};

export default {
  getProfile,
  updateProfile,
  enrichProfile
};