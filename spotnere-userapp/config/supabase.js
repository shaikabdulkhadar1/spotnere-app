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

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
