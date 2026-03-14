import { createClient } from '@supabase/supabase-js';

// Read Supabase connection details from Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Copy .env.example to .env and fill in your values.'
  );
}

// Singleton Supabase client shared across the app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Trigger Microsoft (Azure AD) OAuth login via Supabase.
 * Requests Tasks.ReadWrite and mail.send scopes for Graph API integration.
 * Uses tenant=consumers so personal Microsoft accounts (Outlook/Hotmail) are supported.
 */
export async function signInWithMicrosoft() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      scopes: 'Tasks.ReadWrite mail.send',
      queryParams: {
        tenant: 'consumers',
      },
    },
  });

  if (error) {
    console.error('Microsoft sign-in error:', error.message);
    throw error;
  }

  return data;
}

/**
 * Sign the current user out and clear the local session.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Sign-out error:', error.message);
    throw error;
  }
}
