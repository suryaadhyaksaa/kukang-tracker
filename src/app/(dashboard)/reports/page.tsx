"use client";

import React, { useEffect, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  Filter,
  Users,
  UserCheck,
  GraduationCap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatJakartaDateTime } from "@/lib/utils";

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
  const [loading, setLoading] = useState(true);

  // Filter state
  const [membership, setMembership] = useState<"all" | "active" | "internship">("all");
  const [eventId, setEventId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    async function loadPreview() {
      setLoading(true);
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

  function triggerDownload(targetMembership: "all" | "active" | "internship") {
    const params = new URLSearchParams();
    params.set("membership", targetMembership);
    if (eventId) params.set("eventId", eventId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    window.location.href = `/api/reports/export?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">
          Export & Laporan Absensi CSV
        </h1>
        <p className="text-sm text-stone-400">
          Unduh rekap absensi terpisah untuk Anggota Tetap (Aktif) dan Anggota Magang (Internship)
        </p>
      </div>

      {/* Ringkasan Cepat & Tombol Unduh Terpisah */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="kukang-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-400">Absensi Anggota Tetap</p>
              <p className="mt-1 font-heading text-2xl font-bold text-emerald-400">
                {activeCount} <span className="text-xs font-normal text-stone-400">rekaman</span>
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/50 p-2.5 text-emerald-400">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <button
            type="button"
            onClick={() => triggerDownload("active")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-900/50"
          >
            <Download className="h-4 w-4" />
            <span>Unduh CSV Anggota Tetap</span>
          </button>
        </div>

        <div className="kukang-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-400">Absensi Anggota Magang</p>
              <p className="mt-1 font-heading text-2xl font-bold text-amber-400">
                {internshipCount} <span className="text-xs font-normal text-stone-400">rekaman</span>
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/50 p-2.5 text-amber-400">
              <GraduationCap className="h-5 w-5" />
            </div>
          </div>
          <button
            type="button"
            onClick={() => triggerDownload("internship")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/40 py-2.5 text-xs font-bold text-amber-300 hover:bg-amber-900/50"
          >
            <Download className="h-4 w-4" />
            <span>Unduh CSV Anggota Magang</span>
          </button>
        </div>

        <div className="kukang-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-400">Total Gabungan</p>
              <p className="mt-1 font-heading text-2xl font-bold text-white">
                {rows.length} <span className="text-xs font-normal text-stone-400">rekaman</span>
              </p>
            </div>
            <div className="rounded-xl border border-[#C89D3C]/40 bg-[#1B0E10] p-2.5 text-[#E5B94C]">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <button
            type="button"
            onClick={() => triggerDownload("all")}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9E0B0B] to-[#C81E1E] py-2.5 text-xs font-bold text-white hover:brightness-110"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Unduh CSV Gabungan</span>
          </button>
        </div>
      </div>

      {/* Filter Kustom */}
      <div className="kukang-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Filter className="h-4 w-4 text-[#E5B94C]" />
          <span>Filter Data & Pratinjau CSV</span>
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

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => triggerDownload(membership)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9E0B0B] via-[#B91C1C] to-[#C89D3C] px-5 py-2.5 text-xs font-bold text-white hover:brightness-110"
          >
            <Download className="h-4 w-4" />
            <span>
              Download CSV (
              {membership === "active"
                ? "Anggota Tetap"
                : membership === "internship"
                ? "Anggota Magang"
                : "Semua Anggota"}
              )
            </span>
          </button>
        </div>
      </div>

      {/* Tabel Pratinjau */}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3B181A]/60 text-stone-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                    Memuat data absensi...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}