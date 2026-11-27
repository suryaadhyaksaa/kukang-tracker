import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const attendanceId = resolvedParams.id;

    if (!attendanceId) {
      return NextResponse.json(
        { error: "ID data absensi tidak ditemukan." },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      return NextResponse.json(
        { error: "Hanya Admin atau Super Admin yang dapat menghapus data absensi." },
        { status: 403 }
      );
    }

    const adminDb = createAdminSupabase();

    // Ambil detail absensi sebelum dihapus untuk catatan Activity Log
    const { data: targetRow } = await adminDb
      .from("attendance")
      .select("id, members(full_name, nim), events(title)")
      .eq("id", attendanceId)
      .maybeSingle();

    const { error: deleteErr } = await adminDb
      .from("attendance")
      .delete()
      .eq("id", attendanceId);

    if (deleteErr) {
      return NextResponse.json(
        { error: `Gagal menghapus data absensi: ${deleteErr.message}` },
        { status: 500 }
      );
    }

    const memberInfo = targetRow?.members as unknown as { full_name?: string; nim?: string } | null;
    const eventInfo = targetRow?.events as unknown as { title?: string } | null;

    await adminDb
      .from("activity_logs")
      .insert({
        user_id: session.user.id,
        action: "ATTENDANCE_DELETED",
        description: `Menghapus absensi ${memberInfo?.full_name || "Anggota"} (${memberInfo?.nim || "-"}) pada kegiatan ${eventInfo?.title || "-"}`,
      })
      .then(() => null, () => null);

    return NextResponse.json({
      success: true,
      message: "Data absensi anggota berhasil dihapus.",
    });
  } catch (err) {
    console.error("[DELETE_ATTENDANCE_ERROR]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat menghapus absensi." },
      { status: 500 }
    );
  }
}