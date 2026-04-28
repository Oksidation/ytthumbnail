import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

// Loose schema typing — we don't ship generated Database types in v1.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

let cached: AdminClient | null = null;

/**
 * Service-role client. Bypasses RLS. Use ONLY in:
 *   - /api/stripe/webhook (idempotent topups)
 *   - /api/generate (debit/refund/storage writes)
 *
 * Never import this from a client component or page.
 */
export function createSupabaseAdminClient(): AdminClient {
  if (cached) return cached;
  const env = serverEnv();
  cached = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  ) as AdminClient;
  return cached;
}
