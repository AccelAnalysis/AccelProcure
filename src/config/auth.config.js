import { createClient } from '@supabase/supabase-js';
import { env } from '../config/app.config';

// Initialize Supabase client
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Auth configuration
export const authConfig = {
  // Auth providers
  providers: {
    email: true,
    google: true,
    github: false, // Enable if you want GitHub auth
  },
  
  // Password reset options
  passwordReset: {
    url: `${window.location.origin}/reset-password`,
  },
  
  // Email confirmation options
  emailConfirmation: {
    redirectTo: `${window.location.origin}/dashboard`,
  },
  
  // Session configuration
  session: {
    name: 'accelrfx-session',
    lifetime: 60 * 60 * 24 * 7, // 7 days in seconds
  },
};

// Helper functions
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUp = async (email, password, userData) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: userData?.fullName || '',
        company: userData?.company || '',
      },
    },
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = () => {
  return supabase.auth.getUser();
};

export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};

export const resetPassword = async (email) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/update-password`,
  });
  return { data, error };
};

export const updatePassword = async (newPassword) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
};

export default {
  supabase,
  authConfig,
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  onAuthStateChange,
  resetPassword,
  updatePassword,
};