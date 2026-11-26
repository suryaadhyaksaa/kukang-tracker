import * as XLSX from "xlsx";
import { formatJakartaDateTime } from "@/lib/utils";

/**
 * Menghasilkan buffer file .xlsx dengan 6 Sheet standar KUKANG EV:
 * 1. Dashboard
 * 2. Master_Anggota
 * 3. Master_Kegiatan
 * 4. Data_Absensi
 * 5. Data_Kontribusi
 * 6. Dokumentasi
 */
export function buildKukangWorkbookBuffer(data: {
  members: Record<string, unknown>[];
  events: Record<string, unknown>[];
  attendance: Record<string, unknown>[];
  contributions: Record<string, unknown>[];
  documentation: Record<string, unknown>[];
}): Buffer {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Dashboard Ringkasan
  const dashboardRows = [
    ["KUKANG EV ITERA - ATTENDANCE & CONTRIBUTION TRACKER"],
    ["Tagline", "Silent Drive, Powerful Impact"],
    ["Waktu Ekspor (WIB)", formatJakartaDateTime(new Date().toISOString())],
    ["Catatan", "Snapshot ekspor lokal .xlsx (bukan koneksi live Excel Online)"],
    [],
    ["METRIK UTAMA", "TOTAL"],
    ["Total Anggota Terdaftar", data.members.length],
    ["Total Kegiatan", data.events.length],
    ["Total Rekaman Kehadiran", data.attendance.length],
    ["Total Catatan Kontribusi", data.contributions.length],
    ["Total File Dokumentasi", data.documentation.length],
  ];
  const wsDashboard = XLSX.utils.aoa_to_sheet(dashboardRows);
  XLSX.utils.book_append_sheet(wb, wsDashboard, "Dashboard");

  // Sheet 2: Master_Anggota
  const wsMembers = XLSX.utils.json_to_sheet(
    data.members.map((m) => ({
      Member_ID: m.id,
      NIM: m.nim,
      Nama_Lengkap: m.full_name,
      Email: m.email,
      No_HP: m.phone || "-",
      Angkatan: m.angkatan,
      Divisi: (m.divisions as { name?: string } | null)?.name || "-",
      Jabatan: m.position,
      Status: m.membership_status,
    }))
  );
  XLSX.utils.book_append_sheet(wb, wsMembers, "Master_Anggota");

  // Sheet 3: Master_Kegiatan
  const wsEvents = XLSX.utils.json_to_sheet(
    data.events.map((e) => ({
      Event_ID: e.id,
      Nama_Kegiatan: e.title,
      Tanggal: e.event_date,
      Lokasi: e.location,
      Status: e.status,
      QR_Token: e.qr_token,
    }))
  );
  XLSX.utils.book_append_sheet(wb, wsEvents, "Master_Kegiatan");

  // Sheet 4: Data_Absensi
  const wsAttendance = XLSX.utils.json_to_sheet(
    data.attendance.map((a) => ({
      Attendance_ID: a.id,
      Member_ID: a.member_id,
      NIM: a.nim_snapshot,
      Nama_Anggota: a.member_name_snapshot,
      Jabatan: a.position_snapshot,
      Divisi: a.division_name_snapshot,
      Event_ID: a.event_id,
      Nama_Kegiatan: a.event_title_snapshot,
      Tanggal: a.attendance_date,
      Jam_Check_In: formatJakartaDateTime(String(a.check_in_time)),
      Status_Kehadiran: a.status,
      Status_Sync_Excel: a.excel_sync_status,
    }))
  );
  XLSX.utils.book_append_sheet(wb, wsAttendance, "Data_Absensi");

  // Sheet 5: Data_Kontribusi
  const wsContributions = XLSX.utils.json_to_sheet(
    data.contributions.map((c) => ({
      Contribution_ID: c.id,
      Nama_Kegiatan: (c.events as { title?: string } | null)?.title || "-",
      NIM: (c.members as { nim?: string } | null)?.nim || "-",
      Nama_Anggota: (c.members as { full_name?: string } | null)?.full_name || "-",
      Divisi: (c.divisions as { name?: string } | null)?.name || "-",
      Peran: c.role_in_event,
      Kategori: c.category,
      Deskripsi_Pekerjaan: c.work_description,
      Hasil_Pekerjaan: c.work_output,
      Link_Google_Drive: c.gdrive_link || "-",
      Status_Verifikasi: c.verification_status,
      Catatan_Admin: c.admin_notes || "-",
      Waktu_Pengiriman: formatJakartaDateTime(String(c.submitted_at)),
    }))
  );
  XLSX.utils.book_append_sheet(wb, wsContributions, "Data_Kontribusi");

  // Sheet 6: Dokumentasi
  const wsDocs = XLSX.utils.json_to_sheet(
    data.documentation.map((d) => ({
      Doc_ID: d.id,
      Contribution_ID: d.contribution_id,
      Event_ID: d.event_id,
      Member_ID: d.member_id,
      Nama_File: d.file_name,
      Tipe: d.file_type,
      URL_Storage: d.public_url,
      Diunggah_Pada: formatJakartaDateTime(String(d.created_at)),
    }))
  );
  XLSX.utils.book_append_sheet(wb, wsDocs, "Dokumentasi");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}