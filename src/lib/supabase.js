import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.vite_supabase_url?.trim();
const supabaseAnonKey = import.meta.env.vite_supabase_anon_key?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getSupabaseConfigError() {
  return 'A autenticação segura ainda não foi configurada. Defina vite_supabase_url e vite_supabase_anon_key.';
}
