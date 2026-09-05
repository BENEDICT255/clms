import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project-id.supabase.co' &&
    supabaseAnonKey !== 'your-anon-public-key-here'
  );
}

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!clientInstance) {
    if (!isSupabaseConfigured()) {
      console.warn(
        'CLMS Configuration Notice: Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not configured. The application is running in unlinked foundation mode. Copy .env.example to .env.local and configure your project credentials.'
      );
    }
    // Fallback URL and key for safe local build and unit tests
    const url = supabaseUrl || 'https://placeholder.supabase.co';
    const key = supabaseAnonKey || 'placeholder-anon-key';

    clientInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return clientInstance;
}

export const supabase = getSupabaseClient();
