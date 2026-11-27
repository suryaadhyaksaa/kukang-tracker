import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (
    str.includes('"') ||
    str.includes(";") ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

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

export async function GET(request: Request) {
  try {
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
        { error: "Hanya Admin atau Super Admin yang dapat mengekspor laporan." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const membershipFilter = searchParams.get("membership") || "all";
    const eventIdFilter = searchParams.get("eventId") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const adminDb = createAdminSupabase();
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
      const member = row.members as Record<string, unknown> | null;
      const event = row.events as Record<string, unknown> | null;

      const effectiveMembership = String(
        row.member_status_snapshot || member?.membership_status || "active"
      ).toLowerCase();

      if (membershipFilter === "active" && effectiveMembership !== "active") {
        return false;
      }
      if (membershipFilter === "internship" && effectiveMembership !== "internship") {
        return false;
      }
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

    const headers = [
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

    // Baris pertama "sep=;" memberi tahu Microsoft Excel agar otomatis membagi kolom berdasarkan ";"
    const csvLines = ["sep=;", headers.map(escapeCsvCell).join(";")];

    filtered.forEach((row: Record<string, unknown>, idx: number) => {
      const member = row.members as Record<string, unknown> | null;
      const division = member?.divisions as Record<string, unknown> | null;
      const event = row.events as Record<string, unknown> | null;

      const effectiveMembership = String(
        row.member_status_snapshot || member?.membership_status || "active"
      ).toLowerCase();

      const line = [
        idx + 1,
        member?.full_name || "-",
        member?.nim || "-",
        formatMembershipLabel(effectiveMembership),
        division?.name || "-",
        member?.angkatan || "-",
        event?.title || "-",
        formatTargetLabel((event?.target_membership as string) || "all"),
        event?.event_date || "-",
        formatWibDateTime(row.check_in_time as string),
        String(row.status || "hadir").toUpperCase(),
      ];

      csvLines.push(line.map(escapeCsvCell).join(";"));
    });

    const today = new Date().toISOString().slice(0, 10);
    const suffix =
      membershipFilter === "active"
        ? "anggota-tetap"
        : membershipFilter === "internship"
        ? "anggota-magang"
        : "semua-anggota";

    const filename = `absensi-kukang-ev-${suffix}-${today}.csv`;
    const csvContent = csvLines.join("\r\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[CSV_EXPORT_ERROR]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat file CSV." },
      { status: 500 }
    );
  }
}