import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Missing Supabase environment variables. Please check your .env.local file.");
}

// Provide fallback dummy values if environment variables are not set or are placeholders
// This prevents the app from crashing with a 500 error ("url: Must be a valid HTTP or HTTPS URL")
const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const finalUrl = supabaseUrl && isValidUrl(supabaseUrl) ? supabaseUrl : "https://placeholder.supabase.co";
const finalKey = supabaseAnonKey || "placeholder-key";

// Create a single supabase client for interacting with your database
export const supabase = createClient(finalUrl, finalKey);
