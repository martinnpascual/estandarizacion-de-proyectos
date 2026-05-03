import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service_role — SOLO para API Routes y Server Actions.
 * NUNCA importar desde Client Components.
 */
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
