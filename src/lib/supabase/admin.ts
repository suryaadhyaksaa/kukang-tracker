import { createClient } from "@supabase/supabase-js";

/**
 * Service Role Client: HANYA digunakan di server-side API routes untuk
 * operasi tervalidasi (check-in timestamp server, audit log, excel sync queue).
 */
export function createAdminSupabase() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}