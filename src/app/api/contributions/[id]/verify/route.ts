import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { writeActivityLog } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminDb = createAdminSupabase();
    const { data: profile } = await adminDb
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Hanya Admin atau Super Admin yang dapat memverifikasi kontribusi." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const status = body?.verification_status;
    const adminNotes = body?.admin_notes ? String(body.admin_notes).trim() : null;

    if (!["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json(
        { error: "Status verifikasi tidak valid." },
        { status: 400 }
      );
    }

    const { data: updated, error } = await adminDb
      .from("contributions")
      .update({
        verification_status: status,
        admin_notes: adminNotes,
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*, members(full_name, nim)")
      .single();

    if (error) throw error;

    await writeActivityLog({
      actorProfileId: user.id,
      actorName: profile.full_name,
      actorRole: profile.role,
      actionType: "CONTRIBUTION_VERIFIED",
      entityType: "contributions",
      entityId: id,
      description: `Admin ${profile.full_name} mengubah status kontribusi ${(updated.members as { full_name?: string })?.full_name || ""} menjadi ${status.toUpperCase()}`,
    });

    return NextResponse.json({ success: true, contribution: updated });
  } catch (err) {
    console.error("[VERIFY_CONTRIBUTION_ERROR]", err);
    return NextResponse.json(
      { error: "Gagal memverifikasi kontribusi." },
      { status: 500 }
    );
  }
}