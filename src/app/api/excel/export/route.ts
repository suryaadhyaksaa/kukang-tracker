import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { buildKukangWorkbookBuffer } from "@/lib/excel/workbook-generator";
import { getJakartaNow } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const divisionId = searchParams.get("divisionId");
    const eventId = searchParams.get("eventId");
    const format = searchParams.get("format") || "xlsx";

    const adminDb = createAdminSupabase();

    const [{ data: members }, { data: events }, { data: documentation }] =
      await Promise.all([
        adminDb.from("members").select("*, divisions(name)").order("nim"),
        adminDb.from("events").select("*").order("event_date", { ascending: false }),
        adminDb.from("documentation").select("*").order("created_at", { ascending: false }),
      ]);

    let attendanceQuery = adminDb
      .from("attendance")
      .select("*")
      .order("check_in_time", { ascending: false });
    if (startDate) attendanceQuery = attendanceQuery.gte("attendance_date", startDate);
    if (endDate) attendanceQuery = attendanceQuery.lte("attendance_date", endDate);
    if (eventId) attendanceQuery = attendanceQuery.eq("event_id", eventId);

    let contribQuery = adminDb
      .from("contributions")
      .select("*, members(nim, full_name), events(title), divisions(name)")
      .order("submitted_at", { ascending: false });
    if (startDate) contribQuery = contribQuery.gte("submitted_at", `${startDate}T00:00:00+07:00`);
    if (endDate) contribQuery = contribQuery.lte("submitted_at", `${endDate}T23:59:59+07:00`);
    if (divisionId) contribQuery = contribQuery.eq("division_id", divisionId);
    if (eventId) contribQuery = contribQuery.eq("event_id", eventId);

    const [{ data: attendance }, { data: contributions }] = await Promise.all([
      attendanceQuery,
      contribQuery,
    ]);

    const todayStr = getJakartaNow().date;

    if (format === "csv") {
      const headers = [
        "Attendance_ID",
        "NIM",
        "Nama_Anggota",
        "Jabatan",
        "Divisi",
        "Kegiatan",
        "Tanggal",
        "Status",
      ];
      const rows = (attendance || []).map((a) =>
        [
          a.id,
          a.nim_snapshot,
          `"${a.member_name_snapshot}"`,
          `"${a.position_snapshot}"`,
          `"${a.division_name_snapshot}"`,
          `"${a.event_title_snapshot}"`,
          a.attendance_date,
          a.status,
        ].join(",")
      );
      const csvContent = [headers.join(","), ...rows].join("\n");

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="KUKANG_EV_Report_${todayStr}.csv"`,
        },
      });
    }

    const buffer = buildKukangWorkbookBuffer({
      members: members || [],
      events: events || [],
      attendance: attendance || [],
      contributions: contributions || [],
      documentation: documentation || [],
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="KUKANG_EV_Workbook_${todayStr}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("[EXCEL_EXPORT_ERROR]", err);
    return NextResponse.json(
      { error: "Gagal membuat file ekspor." },
      { status: 500 }
    );
  }
}