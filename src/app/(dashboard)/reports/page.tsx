"use client";

import React, { useEffect, useState } from "react";
import { FileSpreadsheet, FileText, Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Division, KukangEvent } from "@/types/database";

export default function ReportsExportPage() {
  const [events, setEvents] = useState<KukangEvent[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [eventId, setEventId] = useState("");

  useEffect(() => {
    async function loadFilters() {
      const supabase = createClient();
      const [{ data: eData }, { data: dData }] = await Promise.all([
        supabase.from("events").select("*").order("event_date", { ascending: false }),
        supabase.from("divisions").select("*").order("name"),
      ]);
      setEvents((eData as KukangEvent[]) || []);
      setDivisions((dData as Division[]) || []);
    }
    loadFilters();
  }, []);

  function buildExportUrl(format: "xlsx" | "csv") {
    const params = new URLSearchParams({ format });
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (divisionId) params.set("divisionId", divisionId);
    if (eventId) params.set("eventId", eventId);
    return `/api/excel/export?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">
          Export & Laporan Periodik
        </h1>
        <p className="text-sm text-stone-400">
          Unduh laporan kehadiran & kontribusi per kegiatan, divisi, bulanan,
          maupun semesteran
        </p>
      </div>

      <div className="rounded-2xl border border-[#3B181A] kukang-card p-6 space-y-5">
        <div className="flex items-center gap-2 text-[#E5B94C] text-xs font-semibold uppercase">
          <Filter className="h-4 w-4" />
          <span>Parameter Filter Laporan</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-stone-400">
              Tanggal Mulai
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-400">
              Tanggal Akhir
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-400">Divisi</label>
            <select
              value={divisionId}
              onChange={(e) => setDivisionId(e.target.value)}
              className="w-full rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-white"
            >
              <option value="">Semua Divisi</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-400">
              Kegiatan
            </label>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-white"
            >
              <option value="">Semua Kegiatan</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href={buildExportUrl("xlsx")}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9E0B0B] to-[#C81E1E] px-5 py-3 text-xs font-bold text-white hover:brightness-110"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Download Full Workbook (.XLSX — 6 Sheets)</span>
          </a>
          <a
            href={buildExportUrl("csv")}
            className="inline-flex items-center gap-2 rounded-xl border border-[#C89D3C]/45 bg-[#C89D3C]/15 px-5 py-3 text-xs font-semibold text-[#F5D06F] hover:bg-[#C89D3C]/25"
          >
            <FileText className="h-4 w-4" />
            <span>Export Kehadiran (.CSV)</span>
          </a>
        </div>
      </div>
    </div>
  );
}