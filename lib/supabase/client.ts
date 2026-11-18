"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("As variáveis do Supabase não estão configuradas.");
  if (!client) client = createBrowserClient(url, key, {
    auth: { flowType: "implicit", detectSessionInUrl: true },
  });
  return client;
}
