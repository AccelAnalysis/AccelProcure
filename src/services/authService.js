import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseAnonKey } from '../config/auth.config';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Signs up a new user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<{user: object, session: object, error: Error}>} - User and session data or error
 */
export const signUp = async (email, password) => {
  try {
    const { user, session, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    return { user, session, error: null };
  } catch (error) {
    console.error('Error signing up:', error.message);
    return { user: null, session: null, error };
  }
};

/**
 * Signs in a user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<{user: object, session: object, error: Error}>} - User and session data or error
 */
export const signIn = async (email, password) => {
  try {
    const { user, session, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return { user, session, error: null };
  } catch (error) {
    console.error('Error signing in:', error.message);
    return { user: null, session: null, error };
  }
};

/**
 * Signs out the current user
 * @returns {Promise<{error: Error}>} - Error if any
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error.message);
    return { error };
  }
};

/**
 * Gets the current authenticated user
 * @returns {Promise<{user: object, error: Error}>} - Current user data or error
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    console.error('Error getting current user:', error.message);
    return { user: null, error };
  }
};

/**
 * Sends a password reset email
 * @param {string} email - User's email
 * @returns {Promise<{data: object, error: Error}>} - Response data or error
 */
export const resetPassword = async (email) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error resetting password:', error.message);
    return { data: null, error };
  }
};

/**
 * Updates the user's password
 * @param {string} newPassword - New password
 * @returns {Promise<{data: object, error: Error}>} - Response data or error
 */
export const updatePassword = async (newPassword) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating password:', error.message);
    return { data: null, error };
  }
};

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session);
  // You can add additional logic here for handling auth state changes
});

export default {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  resetPassword,
  updatePassword,
  supabase, // Export the client for direct access if needed
};