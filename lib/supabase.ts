import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured =
  supabaseUrl.startsWith("https://") &&
  supabaseAnonKey.length > 30 &&
  !supabaseUrl.includes("COLE_AQUI") &&
  !supabaseAnonKey.includes("COLE_AQUI");

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
