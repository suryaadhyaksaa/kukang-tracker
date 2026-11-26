import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  isMicrosoftGraphConfigured,
  syncRowToExcelOnline,
  type ExcelTableName,
} from "@/lib/excel/graph-client";
import { formatJakartaDateTime } from "@/lib/utils";

export async function POST(request: Request) {
  try {
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
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isMicrosoftGraphConfigured()) {
      return NextResponse.json(
        {
          configured: false,
          error:
            "Microsoft Graph API belum dikonfigurasi pada environment variables server. Gunakan tombol Download Excel (.xlsx) untuk ekspor lokal.",
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const specificSyncLogId = body?.sync_log_id as string | undefined;

    // Mode 1: Retry spesifik log yang gagal
    if (specificSyncLogId) {
      const { data: logItem } = await adminDb
        .from("excel_sync_logs")
        .select("*")
        .eq("id", specificSyncLogId)
        .single();

      if (!logItem) {
        return NextResponse.json({ error: "Log tidak ditemukan." }, { status: 404 });
      }

      const rowValues = Object.values(logItem.payload || {}) as (
        | string
        | number
        | boolean
        | null
      )[];

      const result = await syncRowToExcelOnline({
        idempotencyKey: logItem.idempotency_key,
        targetTable: logItem.target_table as ExcelTableName,
        recordId: logItem.record_id,
        rowValues,
        payloadObject: logItem.payload,
        sourceTableToUpdate:
          logItem.target_table === "AttendanceTable"
            ? "attendance"
            : logItem.target_table === "ContributionsTable"
            ? "contributions"
            : undefined,
      });

      return NextResponse.json({ success: result.status === "synced", result });
    }

    // Mode 2: Sync Now untuk seluruh data Attendance & Contributions yang belum tersinkronisasi
    let syncedCount = 0;
    let failedCount = 0;

    const { data: unsyncedAttendance } = await adminDb
      .from("attendance")
      .select("*")
      .neq("excel_sync_status", "synced")
      .limit(50);

    for (const att of unsyncedAttendance || []) {
      const res = await syncRowToExcelOnline({
        idempotencyKey: `attendance:${att.id}:insert`,
        targetTable: "AttendanceTable",
        recordId: att.id,
        sourceTableToUpdate: "attendance",
        rowValues: [
          att.id,
          att.member_id,
          att.nim_snapshot,
          att.member_name_snapshot,
          att.position_snapshot,
          att.division_name_snapshot,
          att.event_id,
          att.event_title_snapshot,
          att.attendance_date,
          formatJakartaDateTime(att.check_in_time),
          att.status,
          att.created_at,
        ],
        payloadObject: {
          attendance_id: att.id,
          nim: att.nim_snapshot,
          member_name: att.member_name_snapshot,
          event_title: att.event_title_snapshot,
        },
      });
      if (res.status === "synced") syncedCount++;
      else failedCount++;
    }

    const { data: unsyncedContrib } = await adminDb
      .from("contributions")
      .select("*, members(nim, full_name), events(title), divisions(name)")
      .neq("excel_sync_status", "synced")
      .limit(50);

    for (const c of unsyncedContrib || []) {
      const res = await syncRowToExcelOnline({
        idempotencyKey: `contribution:${c.id}:insert`,
        targetTable: "ContributionsTable",
        recordId: c.id,
        sourceTableToUpdate: "contributions",
        rowValues: [
          c.id,
          (c.events as { title?: string } | null)?.title || "-",
          (c.members as { nim?: string } | null)?.nim || "-",
          (c.members as { full_name?: string } | null)?.full_name || "-",
          (c.divisions as { name?: string } | null)?.name || "-",
          c.role_in_event,
          c.category,
          c.work_description,
          c.work_output,
          c.gdrive_link || "-",
          c.verification_status,
          formatJakartaDateTime(c.submitted_at),
        ],
        payloadObject: {
          contribution_id: c.id,
          category: c.category,
        },
      });
      if (res.status === "synced") syncedCount++;
      else failedCount++;
    }

    return NextResponse.json({
      success: failedCount === 0,
      syncedCount,
      failedCount,
    });
  } catch (err) {
    console.error("[EXCEL_SYNC_API_ERROR]", err);
    return NextResponse.json(
      { error: "Gagal menjalankan sinkronisasi Excel Online." },
      { status: 500 }
    );
  }
}