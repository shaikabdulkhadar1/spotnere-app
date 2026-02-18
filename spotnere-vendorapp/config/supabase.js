/**
 * Supabase client configuration
 * Priority: Constants.expoConfig.extra > process.env.EXPO_PUBLIC_* > process.env.*
 */

import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

// Get Supabase credentials with priority order
const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const supabaseAnonKey =
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY;

// Validate credentials
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file or app.config.js"
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
