// Single browser-side Supabase client for real login (magic link / OTP).
// Every other file in this app talks to Supabase over plain REST fetch with
// the anon key (see buyer-lookup.ts's restGet, etc.) because none of those
// reads need a user session — this is the one exception: auth needs the
// actual supabase-js client so it can manage the session (magic-link token
// exchange, refresh, persistence) instead of us hand-rolling that.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing).");
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}
