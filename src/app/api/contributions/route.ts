import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { writeActivityLog } from "@/lib/audit";
import { syncRowToExcelOnline } from "@/lib/excel/graph-client";
import { formatJakartaDateTime } from "@/lib/utils";
import { CONTRIBUTION_CATEGORIES } from "@/types/database";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      event_id,
      role_in_event,
      category,
      work_description,
      work_output,
      gdrive_link,
      uploaded_files,
    } = body;

    if (!event_id || !role_in_event || !category || !work_description || !work_output) {
      return NextResponse.json(
        { error: "Seluruh field wajib kontribusi harus diisi." },
        { status: 400 }
      );
    }

    if (!CONTRIBUTION_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: "Kategori kontribusi tidak valid." },
        { status: 400 }
      );
    }

    const adminDb = createAdminSupabase();

    const { data: profile } = await adminDb
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", user.id)
      .single();

    const { data: member } = await adminDb
      .from("members")
      .select("*, divisions(id, name)")
      .eq("profile_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: "Data anggota tidak ditemukan." },
        { status: 403 }
      );
    }

    const { data: event } = await adminDb
      .from("events")
      .select("id, title")
      .eq("id", event_id)
      .single();

    if (!event) {
      return NextResponse.json(
        { error: "Kegiatan tidak ditemukan." },
        { status: 404 }
      );
    }

    // Cari record attendance jika anggota sudah check-in pada kegiatan ini
    const { data: attendance } = await adminDb
      .from("attendance")
      .select("id")
      .eq("member_id", member.id)
      .eq("event_id", event.id)
      .maybeSingle();

    const { data: contribution, error: contribErr } = await adminDb
      .from("contributions")
      .insert({
        attendance_id: attendance?.id ?? null,
        member_id: member.id,
        event_id: event.id,
        division_id: member.division_id,
        role_in_event: String(role_in_event).trim(),
        category,
        work_description: String(work_description).trim(),
        work_output: String(work_output).trim(),
        gdrive_link: gdrive_link ? String(gdrive_link).trim() : null,
        verification_status: "pending",
        excel_sync_status: "pending",
      })
      .select()
      .single();

    if (contribErr) throw contribErr;

    // Simpan metadata dokumentasi ke tabel documentation
    if (Array.isArray(uploaded_files) && uploaded_files.length > 0) {
      const docsToInsert = uploaded_files.map(
        (file: {
          file_name: string;
          file_type: "image" | "video";
          mime_type: string;
          file_size_bytes: number;
          storage_path: string;
          public_url: string;
        }) => ({
          contribution_id: contribution.id,
          event_id: event.id,
          member_id: member.id,
          file_name: file.file_name,
          file_type: file.file_type,
          mime_type: file.mime_type,
          file_size_bytes: file.file_size_bytes,
          storage_path: file.storage_path,
          public_url: file.public_url,
        })
      );

      await adminDb.from("documentation").insert(docsToInsert);
    }

    const divisionName =
      (member.divisions as { name?: string } | null)?.name || "Umum";

    await writeActivityLog({
      actorProfileId: user.id,
      actorName: member.full_name,
      actorRole: profile?.role || "member",
      actionType: "CONTRIBUTION_SUBMITTED",
      entityType: "contributions",
      entityId: contribution.id,
      description: `${member.full_name} mengirim laporan kontribusi (${category}) pada "${event.title}"`,
    });

    // Sync ke Excel Online (ContributionsTable)
    const syncResult = await syncRowToExcelOnline({
      idempotencyKey: `contribution:${contribution.id}:insert`,
      targetTable: "ContributionsTable",
      recordId: contribution.id,
      sourceTableToUpdate: "contributions",
      rowValues: [
        contribution.id,
        event.title,
        member.nim,
        member.full_name,
        divisionName,
        contribution.role_in_event,
        contribution.category,
        contribution.work_description,
        contribution.work_output,
        contribution.gdrive_link || "-",
        contribution.verification_status,
        formatJakartaDateTime(contribution.submitted_at),
      ],
      payloadObject: {
        contribution_id: contribution.id,
        event_title: event.title,
        member_name: member.full_name,
        category: contribution.category,
      },
    });

    return NextResponse.json({
      success: true,
      contribution,
      excel_sync: syncResult,
    });
  } catch (err) {
    console.error("[CONTRIBUTION_POST_ERROR]", err);
    return NextResponse.json(
      { error: "Gagal menyimpan laporan kontribusi." },
      { status: 500 }
    );
  }
}