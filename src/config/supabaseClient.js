import { createClient } from '@supabase/supabase-js';

import { ENV_CONFIG } from './app.config';

// Initialize the Supabase client
const supabaseUrl = ENV_CONFIG.SUPABASE_URL;
const supabaseAnonKey = ENV_CONFIG.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Export the configured Supabase client
export { supabase };
