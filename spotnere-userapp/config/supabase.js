import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

/**
 * Supabase Configuration
 * Reads credentials from environment variables
 *
 * Priority order:
 * 1. Constants.expoConfig.extra (from app.config.js - set via EAS secrets)
 * 2. process.env.EXPO_PUBLIC_* (public env vars)
 * 3. process.env.* (fallback)
 */

// Get environment variables
// During EAS builds, these come from app.config.js extra section
// which reads from process.env set by EAS secrets
const SUPABASE_URL =
  Constants.expoConfig?.extra?.supabaseUrl ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

const SUPABASE_ANON_KEY =
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

// Validate that we have the required credentials
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Missing Supabase credentials!");
  console.error(
    "Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file or EAS secrets"
  );
  console.error(
    "For local development, create a .env file with:"
  );
  console.error("SUPABASE_URL=your_supabase_url");
  console.error("SUPABASE_ANON_KEY=your_supabase_anon_key");
  console.error(
    "For EAS builds, set these as secrets: eas secret:create --scope project --name SUPABASE_URL --value your_url"
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
