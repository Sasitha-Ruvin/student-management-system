import { createClient } from "@supabase/supabase-js";

import { getSupabaseServiceKey, getSupabaseUrl } from "@/lib/env";

export function createAdminClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
