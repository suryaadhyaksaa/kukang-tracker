import { createAdminSupabase } from "@/lib/supabase/admin";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RegisterPage() {
  let divisions: { id: string; name: string }[] = [];

  try {
    const adminDb = createAdminSupabase();
    const { data, error } = await adminDb
      .from("divisions")
      .select("id, name")
      .order("name", { ascending: true });

    if (!error && data) {
      divisions = data;
    }
  } catch {
    divisions = [];
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-transparent px-4 py-10 kukang-silk-overlay">
      <RegisterForm divisions={divisions} />
    </div>
  );
}