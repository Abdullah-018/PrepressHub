import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const config = window.PREPRESSHUB_CONFIG || {};
export const isConfigured = Boolean(
  config.SUPABASE_URL &&
  config.SUPABASE_PUBLISHABLE_KEY &&
  !String(config.SUPABASE_URL).includes('PASTE_') &&
  !String(config.SUPABASE_PUBLISHABLE_KEY).includes('PASTE_')
);

export const supabase = isConfigured
  ? createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;
