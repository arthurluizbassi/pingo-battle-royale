import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

/** Service-role client for CLI scripts (never used in the browser). */
export function scriptAdminClient() {
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
