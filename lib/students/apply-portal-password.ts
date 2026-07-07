import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Updates the Supabase auth password for an existing portal account.
 * Uses the service-role admin client — no email confirmation required.
 */
export async function applyPortalPassword(
  supabaseId: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase.auth.admin.updateUserById(supabaseId, { password });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
