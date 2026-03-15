import { createClient } from '@supabase/supabase-js';

// Service role client — only used in /admin, never exposed to regular users
const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const serviceRoleKey  = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

export const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
