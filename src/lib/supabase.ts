import { createClient } from "@supabase/supabase-js";

// Service-role client for server-side route handlers only. Never import this
// into client components — it bypasses RLS. There's a single user (Arjun) and
// no auth, so RLS isn't in play, but keep the key server-side regardless.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
