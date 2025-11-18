import { createClient } from '@supabase/supabase-js';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

import { ENV_CONFIG } from './app.config';

export const supabaseUrl = ENV_CONFIG.SUPABASE_URL;
export const supabaseAnonKey = ENV_CONFIG.SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null;

const firebaseConfig = ENV_CONFIG.FIREBASE;
const hasFirebaseConfig = Object.values(firebaseConfig).some(Boolean);

const firebaseApp = hasFirebaseConfig
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
export const firebaseProviders = {
  google: firebaseAuth ? new GoogleAuthProvider() : null,
};

export const authConfig = {
  providers: {
    email: true,
    google: Boolean(firebaseProviders.google),
    github: false,
  },
  passwordReset: {
    url: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : '',
  },
  emailConfirmation: {
    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : '',
  },
  session: {
    name: 'accelrfx-session',
    lifetime: 60 * 60 * 24 * 7,
  },
};

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }
  return supabase;
};

export const signIn = async (email, password) => {
  const client = requireSupabase();
  return client.auth.signInWithPassword({ email, password });
};

export const signUp = async (email, password, userData = {}) => {
  const client = requireSupabase();
  const fullName =
    userData.fullName ||
    [userData.firstName, userData.lastName].filter(Boolean).join(' ') ||
    userData.first_name ||
    '';
  return client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        first_name: userData.firstName || userData.first_name || '',
        last_name: userData.lastName || userData.last_name || '',
        company: userData.company || '',
      },
    },
  });
};

export const signOut = async () => {
  const client = requireSupabase();
  return client.auth.signOut();
};

export const getCurrentUser = () => {
  const client = requireSupabase();
  return client.auth.getUser();
};

export const onAuthStateChange = (callback) => {
  const client = requireSupabase();
  return client.auth.onAuthStateChange((event, session) => {
    callback?.(event, session);
  });
};

export const resetPassword = async (email) => {
  const client = requireSupabase();
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/update-password` : undefined;
  return client.auth.resetPasswordForEmail(email, { redirectTo });
};

export const updatePassword = async (newPassword) => {
  const client = requireSupabase();
  return client.auth.updateUser({ password: newPassword });
};

export default {
  supabase,
  supabaseUrl,
  supabaseAnonKey,
  firebaseApp,
  firebaseAuth,
  firebaseProviders,
  authConfig,
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  onAuthStateChange,
  resetPassword,
  updatePassword,
};
