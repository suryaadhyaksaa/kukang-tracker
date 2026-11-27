"use client";

import React, { useEffect, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  Filter,
  UserCheck,
  GraduationCap,
  Layers,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatJakartaDateTime } from "@/lib/utils";
import type { UserRole } from "@/types/database";

interface AttendancePreviewRow {
  id: string;
  check_in_time: string;
  status: string;
  member_status_snapshot?: string;
  members: {
    full_name: string;
    nim: string;
    angkatan: number;
    membership_status: string;
    divisions: { name: string } | null;
  } | null;
  events: {
    id: string;
    title: string;
    event_date: string;
    target_membership?: string;
  } | null;
}

interface EventOption {
  id: string;
  title: string;
  event_date: string;
}

export default function ReportsPage() {
  const supabase = createClient();

  const [rows, setRows] = useState<AttendancePreviewRow[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [role, setRole] = useState<UserRole>("member");
  const [loading, setLoading] = useState(true);

  const [membership, setMembership] = useState<"all" | "active" | "internship">("all");
  const [eventId, setEventId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<AttendancePreviewRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isAdmin = role === "admin" || role === "super_admin";

  useEffect(() => {
    async function loadPreview() {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        if (profile?.role) {
          setRole(profile.role as UserRole);
        }
      }

      const [{ data: attData }, { data: evData }] = await Promise.all([
        supabase
          .from("attendance")
          .select(`
            id,
            check_in_time,
            status,
            member_status_snapshot,
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
          .order("check_in_time", { ascending: false })
          .limit(200),
        supabase
          .from("events")
          .select("id, title, event_date")
          .order("event_date", { ascending: false }),
      ]);

      setRows((attData as unknown as AttendancePreviewRow[]) || []);
      setEvents((evData as EventOption[]) || []);
      setLoading(false);
    }

    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = rows.filter((row) => {
    const status = (
      row.member_status_snapshot ||
      row.members?.membership_status ||
      "active"
    ).toLowerCase();

    if (membership === "active" && status !== "active") return false;
    if (membership === "internship" && status !== "internship") return false;
    if (eventId && row.events?.id !== eventId) return false;

    const dateVal = row.events?.event_date || row.check_in_time.slice(0, 10);
    if (startDate && dateVal < startDate) return false;
    if (endDate && dateVal > endDate) return false;

    return true;
  });

  const activeCount = rows.filter(
    (r) =>
      (r.member_status_snapshot || r.members?.membership_status || "active") ===
      "active"
  ).length;

  const internshipCount = rows.filter(
    (r) =>
      (r.member_status_snapshot || r.members?.membership_status) ===
      "internship"
  ).length;

  function triggerExcelMultiSheetDownload() {
    const params = new URLSearchParams();
    if (eventId) params.set("eventId", eventId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    const query = params.toString();
    window.location.href = `/api/reports/export-xlsx${query ? `?${query}` : ""}`;
  }

  function triggerCsvDownload(targetMembership: "all" | "active" | "internship") {
    const params = new URLSearchParams();
    params.set("membership", targetMembership);
    if (eventId) params.set("eventId", eventId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    window.location.href = `/api/reports/export?${params.toString()}`;
  }

  async function handleConfirmDeleteAttendance() {
    if (!deleteTarget) return;
    setDeleting(true);
    setFeedbackMsg(null);

    const targetId = deleteTarget.id;
    const previousRows = rows;

    setRows(rows.filter((r) => r.id !== targetId));
    setDeleteTarget(null);

    try {
      const res = await fetch(`/api/attendance/${targetId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        setRows(previousRows);
        setFeedbackMsg({
          type: "error",
          text: data.error || "Gagal menghapus data absensi.",
        });
      } else {
        setFeedbackMsg({
          type: "success",
          text: data.message || "Data absensi berhasil dihapus.",
        });
      }
    } catch {
      setRows(previousRows);
      setFeedbackMsg({
        type: "error",
        text: "Gagal terhubung ke server saat menghapus absensi.",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">
          Export & Laporan Absensi
        </h1>
        <p className="text-sm text-stone-400">
          Kelola rekap kehadiran, hapus absensi yang tidak valid, dan unduh laporan Excel (.xlsx) / CSV
        </p>
      </div>

      {feedbackMsg && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs ${
            feedbackMsg.type === "success"
              ? "border-emerald-500/40 bg-emerald-950/60 text-emerald-200"
              : "border-red-500/40 bg-red-950/60 text-red-200"
          }`}
        >
          {feedbackMsg.text}
        </div>
      )}

      {/* Kartu Utama Excel Multi-Sheet (1 File, Beda Sheet) */}
      <div className="kukang-card rounded-2xl border border-[#C89D3C]/50 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#C89D3C]/40 bg-[#C89D3C]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#F5D06F]">
            <Layers className="h-3.5 w-3.5" />
            <span>1 File Excel • 3 Sheet Terpisah</span>
          </div>
          <h2 className="font-heading text-lg font-bold text-white">
            Workbook Excel Multi-Sheet (.xlsx)
          </h2>
          <p className="text-xs text-stone-300">
            Otomatis memisahkan data ke dalam <strong className="text-emerald-300">Sheet 1: Anggota Tetap</strong> ({activeCount}),{" "}
            <strong className="text-amber-300">Sheet 2: Anggota Magang</strong> ({internshipCount}), dan{" "}
            <strong className="text-white">Sheet 3: Rekap Gabungan</strong> ({rows.length}).
          </p>
        </div>

        <button
          type="button"
          onClick={triggerExcelMultiSheetDownload}
          className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9E0B0B] via-[#B91C1C] to-[#C89D3C] px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-black/50 hover:brightness-110"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Unduh 1 File Excel (.xlsx)</span>
        </button>
      </div>

      {/* Opsi Unduhan CSV Terpisah */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="kukang-card rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/50 p-2.5 text-emerald-400">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">CSV Anggota Tetap</p>
              <p className="text-[11px] text-stone-400">{activeCount} rekaman kehadiran</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => triggerCsvDownload("active")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV Tetap</span>
          </button>
        </div>

        <div className="kukang-card rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/50 p-2.5 text-amber-400">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">CSV Anggota Magang</p>
              <p className="text-[11px] text-stone-400">{internshipCount} rekaman kehadiran</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => triggerCsvDownload("internship")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/40 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-900/50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV Magang</span>
          </button>
        </div>
      </div>

      {/* Filter Kustom */}
      <div className="kukang-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Filter className="h-4 w-4 text-[#E5B94C]" />
          <span>Filter Rentang Waktu & Kegiatan</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-[11px] text-stone-400">
              Kategori Keanggotaan
            </label>
            <select
              value={membership}
              onChange={(e) =>
                setMembership(e.target.value as "all" | "active" | "internship")
              }
              className="w-full rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2.5 text-xs text-white focus:border-[#C89D3C] focus:outline-none"
            >
              <option value="all">Semua (Tetap & Magang)</option>
              <option value="active">Khusus Anggota Tetap</option>
              <option value="internship">Khusus Anggota Magang</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-stone-400">
              Filter Kegiatan
            </label>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2.5 text-xs text-white focus:border-[#C89D3C] focus:outline-none"
            >
              <option value="">Semua Kegiatan</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({ev.event_date})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-stone-400">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2.5 text-xs text-white focus:border-[#C89D3C] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-stone-400">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2.5 text-xs text-white focus:border-[#C89D3C] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Tabel Data Absensi + Tombol Hapus */}
      <div className="kukang-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#3B181A] bg-[#120809] text-stone-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Nama Anggota</th>
                <th className="px-4 py-3 font-semibold">NIM</th>
                <th className="px-4 py-3 font-semibold">Status Keanggotaan</th>
                <th className="px-4 py-3 font-semibold">Divisi / Bagian</th>
                <th className="px-4 py-3 font-semibold">Kegiatan</th>
                <th className="px-4 py-3 font-semibold">Waktu Check-In</th>
                {isAdmin && <th className="px-4 py-3 text-right font-semibold">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3B181A]/60 text-stone-200">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-stone-400">
                    Memuat data absensi...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-stone-400">
                    Tidak ada data absensi untuk filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const status = (
                    row.member_status_snapshot ||
                    row.members?.membership_status ||
                    "active"
                  ).toLowerCase();

                  return (
                    <tr key={row.id} className="hover:bg-[#1A0D0E]/60">
                      <td className="px-4 py-3 font-medium text-white">
                        {row.members?.full_name || "-"}
                      </td>
                      <td className="px-4 py-3 font-mono text-stone-400">
                        {row.members?.nim || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {status === "internship" ? (
                          <span className="inline-flex rounded-full border border-amber-500/40 bg-amber-950/60 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300">
                            Anggota Magang
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-emerald-500/40 bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                            Anggota Tetap
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-300">
                        {row.members?.divisions?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-stone-200">
                        {row.events?.title || "-"}
                      </td>
                      <td className="px-4 py-3 text-stone-400">
                        {formatJakartaDateTime(row.check_in_time)}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(row)}
                            title="Hapus Data Absensi Ini"
                            className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-950/50 px-2.5 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-900/70 hover:text-white"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Hapus</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Konfirmasi Hapus Absensi */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="kukang-card w-full max-w-md rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#3B181A] pb-3">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-heading text-base font-bold text-white">
                  Hapus Data Absensi?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg p-1 text-stone-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-stone-300">
              <p>
                Anda akan menghapus kehadiran{" "}
                <strong className="text-[#F5D06F]">
                  {deleteTarget.members?.full_name || "Anggota"}
                </strong>{" "}
                ({deleteTarget.members?.nim || "-"}) pada kegiatan{" "}
                <strong className="text-white">
                  {deleteTarget.events?.title || "-"}
                </strong>.
              </p>
              <p className="rounded-xl border border-amber-500/30 bg-amber-950/40 p-3 text-amber-200">
                Setelah dihapus, anggota tersebut dapat melakukan scan QR check-in ulang jika diperlukan.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-xl border border-[#4A2022] px-4 py-2 text-xs font-medium text-stone-300 hover:bg-[#1E0E10]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAttendance}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#9E0B0B] to-[#DC2626] px-4 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{deleting ? "Menghapus..." : "Ya, Hapus Absensi"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}