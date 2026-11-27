import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

const HEADERS = [
  "No",
  "Nama Anggota",
  "NIM",
  "Status Keanggotaan",
  "Divisi / Bagian",
  "Angkatan",
  "Nama Kegiatan",
  "Ketetapan Peserta Kegiatan",
  "Tanggal Kegiatan",
  "Waktu Check-In",
  "Status Kehadiran",
];

function formatWibDateTime(isoString?: string | null): string {
  if (!isoString) return "-";
  try {
    const date = new Date(isoString);
    return (
      new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date) + " WIB"
    );
  } catch {
    return isoString;
  }
}

function formatMembershipLabel(status: string): string {
  return status === "internship"
    ? "Anggota Magang / Internship"
    : "Anggota Tetap / Aktif";
}

function formatTargetLabel(target?: string | null): string {
  if (target === "active") return "Khusus Anggota Tetap";
  if (target === "internship") return "Khusus Anggota Magang";
  return "Semua Anggota (Tetap & Magang)";
}

function buildWorksheet(rows: (string | number)[][]) {
  const worksheet = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
  worksheet["!cols"] = [
    { wch: 5 },  // No
    { wch: 26 }, // Nama Anggota
    { wch: 15 }, // NIM
    { wch: 28 }, // Status Keanggotaan
    { wch: 30 }, // Divisi / Bagian
    { wch: 11 }, // Angkatan
    { wch: 28 }, // Nama Kegiatan
    { wch: 30 }, // Ketetapan Peserta Kegiatan
    { wch: 16 }, // Tanggal Kegiatan
    { wch: 24 }, // Waktu Check-In
    { wch: 18 }, // Status Kehadiran
  ];
  return worksheet;
}

export async function GET(request: Request) {
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

    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      return NextResponse.json(
        { error: "Hanya Admin atau Super Admin yang dapat mengekspor laporan." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventIdFilter = searchParams.get("eventId") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const { data: records, error } = await adminDb
      .from("attendance")
      .select(`
        *,
        members (
          full_name,
          nim,
          angkatan,
          membership_status,
          divisions ( name )
        ),
        events (
          id,
          title,
          event_date,
          target_membership
        )
      `)
      .order("check_in_time", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: `Gagal mengambil data absensi: ${error.message}` },
        { status: 500 }
      );
    }

    const filtered = (records || []).filter((row: Record<string, unknown>) => {
      const event = row.events as Record<string, unknown> | null;

      if (eventIdFilter && String(event?.id || "") !== eventIdFilter) {
        return false;
      }

      const rawDate = String(
        event?.event_date || String(row.check_in_time || "").slice(0, 10)
      );
      if (startDate && rawDate && rawDate < startDate) {
        return false;
      }
      if (endDate && rawDate && rawDate > endDate) {
        return false;
      }

      return true;
    });

    const tetapRecords: Record<string, unknown>[] = [];
    const magangRecords: Record<string, unknown>[] = [];

    filtered.forEach((row: Record<string, unknown>) => {
      const member = row.members as Record<string, unknown> | null;
      const effectiveMembership = String(
        row.member_status_snapshot || member?.membership_status || "active"
      ).toLowerCase();

      if (effectiveMembership === "internship") {
        magangRecords.push(row);
      } else {
        tetapRecords.push(row);
      }
    });

    const mapToRow = (row: Record<string, unknown>, idx: number): (string | number)[] => {
      const member = row.members as Record<string, unknown> | null;
      const division = member?.divisions as Record<string, unknown> | null;
      const event = row.events as Record<string, unknown> | null;

      const effectiveMembership = String(
        row.member_status_snapshot || member?.membership_status || "active"
      ).toLowerCase();

      return [
        idx + 1,
        String(member?.full_name || row.member_name_snapshot || "-"),
        String(member?.nim || row.nim_snapshot || "-"),
        formatMembershipLabel(effectiveMembership),
        String(division?.name || row.division_name_snapshot || "-"),
        (member?.angkatan as number) || "-",
        String(event?.title || row.event_title_snapshot || "-"),
        formatTargetLabel((event?.target_membership as string) || "all"),
        String(event?.event_date || row.event_date_snapshot || "-"),
        formatWibDateTime(row.check_in_time as string),
        String(row.status || "hadir").toUpperCase(),
      ];
    };

    const tetapRows = tetapRecords.map(mapToRow);
    const magangRows = magangRecords.map(mapToRow);
    const gabunganRows = filtered.map(mapToRow);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, buildWorksheet(tetapRows), "Anggota Tetap");
    XLSX.utils.book_append_sheet(workbook, buildWorksheet(magangRows), "Anggota Magang");
    XLSX.utils.book_append_sheet(workbook, buildWorksheet(gabunganRows), "Rekap Gabungan");

    const xlsxBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const today = new Date().toISOString().slice(0, 10);
    const filename = `rekap-absensi-kukang-ev-${today}.xlsx`;

    return new NextResponse(new Uint8Array(xlsxBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[XLSX_EXPORT_ERROR]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat file Excel (.xlsx)." },
      { status: 500 }
    );
  }
}