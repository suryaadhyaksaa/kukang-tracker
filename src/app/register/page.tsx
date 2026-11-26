import React from "react";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  let divisions: { id: string; name: string }[] = [];

  try {
    const adminDb = createAdminSupabase();
    const { data } = await adminDb
      .from("divisions")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    divisions = data || [];
  } catch {
    // Fallback apabila .env.local belum dikonfigurasi
    divisions = [];
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050816] p-4 py-10">
      <RegisterForm divisions={divisions} />
    </div>
  );
}