import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { writeActivityLog } from "@/lib/audit";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    if (!eventId) {
      return NextResponse.json(
        { error: "ID kegiatan tidak valid." },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Sesi login tidak valid." },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      return NextResponse.json(
        { error: "Hanya Admin atau Super Admin yang dapat menghapus kegiatan." },
        { status: 403 }
      );
    }

    const adminDb = createAdminSupabase();

    // Ambil detail kegiatan sebelum dihapus untuk kebutuhan Activity Log
    const { data: existingEvent } = await adminDb
      .from("events")
      .select("id, title, qr_token, event_date")
      .eq("id", eventId)
      .single();

    if (!existingEvent) {
      return NextResponse.json(
        { error: "Kegiatan tidak ditemukan atau sudah dihapus." },
        { status: 404 }
      );
    }

    const { error: deleteError } = await adminDb
      .from("events")
      .delete()
      .eq("id", eventId);

    if (deleteError) {
      return NextResponse.json(
        { error: `Gagal menghapus kegiatan: ${deleteError.message}` },
        { status: 500 }
      );
    }

    await writeActivityLog({
      actorProfileId: user.id,
      actorName: profile.full_name || user.email || "Admin",
      actorRole: profile.role,
      actionType: "EVENT_DELETED",
      entityType: "events",
      entityId: eventId,
      description: `Menghapus kegiatan "${existingEvent.title}" (${existingEvent.qr_token})`,
      metadata: {
        title: existingEvent.title,
        qr_token: existingEvent.qr_token,
        event_date: existingEvent.event_date,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE_EVENT_ERROR]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat menghapus kegiatan." },
      { status: 500 }
    );
  }
}