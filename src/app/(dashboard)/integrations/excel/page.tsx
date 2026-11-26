"use client";

import React, { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatJakartaDateTime } from "@/lib/utils";
import type { ExcelSyncLog } from "@/types/database";

export default function ExcelIntegrationPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<ExcelSyncLog[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  async function loadSyncLogs() {
    const { data } = await supabase
      .from("excel_sync_logs")
      .select("*")
      .order("last_attempted_at", { ascending: false })
      .limit(30);
    setLogs((data as ExcelSyncLog[]) || []);
  }

  useEffect(() => {
    loadSyncLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSyncNow(syncLogId?: string) {
    setSyncing(true);
    setBannerMessage(null);
    try {
      const res = await fetch("/api/excel/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(syncLogId ? { sync_log_id: syncLogId } : {}),
      });
      const data = await res.json();
      if (!res.ok) {
        setBannerMessage(data.error || "Sinkronisasi gagal.");
      } else {
        setBannerMessage(
          syncLogId
            ? "Retry sinkronisasi selesai diproses."
            : `Sync Now selesai: ${data.syncedCount ?? 0} berhasil, ${
                data.failedCount ?? 0
              } gagal.`
        );
      }
      loadSyncLogs();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">
            Integrasi Microsoft Excel Online
          </h1>
          <p className="text-sm text-stone-400">
            Sinkronisasi otomatis ke OneDrive / SharePoint via Microsoft Graph API
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleSyncNow()}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9E0B0B] to-[#C81E1E] px-4 py-2.5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Menyinkronkan..." : "Sync Now"}</span>
          </button>

          <a
            href="/api/excel/export?format=xlsx"
            className="inline-flex items-center gap-2 rounded-xl border border-[#C89D3C]/45 bg-[#C89D3C]/15 px-4 py-2.5 text-xs font-semibold text-[#F5D06F] hover:bg-[#C89D3C]/25"
          >
            <Download className="h-4 w-4" />
            <span>Download Excel (.xlsx)</span>
          </a>
        </div>
      </div>

      {/* Penjelasan Perbedaan Live Sync vs Download File Biasa */}
      <div className="flex items-start gap-3 rounded-2xl border border-[#C89D3C]/35 bg-[#C89D3C]/10 p-4 text-xs text-amber-100">
        <Info className="h-5 w-5 shrink-0 text-[#E5B94C]" />
        <div className="space-y-1">
          <p className="font-semibold text-white">
            Arsitektur Hybrid: Supabase Real-Time + Microsoft Graph API
          </p>
          <p>
            Setiap check-in atau pengiriman kontribusi disimpan langsung ke
            Supabase PostgreSQL (real-time dashboard) dan dikirimkan ke Named
            Tables (<code className="text-amber-300">MembersTable</code>,{" "}
            <code className="text-amber-300">EventsTable</code>,{" "}
            <code className="text-amber-300">AttendanceTable</code>,{" "}
            <code className="text-amber-300">ContributionsTable</code>) pada
            workbook Excel Online. Tombol <strong>Download Excel (.xlsx)</strong>{" "}
            mengunduh salinan lokal statis dan <strong>bukan</strong> merupakan
            sinkronisasi live dua arah ke Excel Online.
          </p>
        </div>
      </div>

      {bannerMessage && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          {bannerMessage}
        </div>
      )}

      {/* Sync Logs Table */}
      <div className="rounded-2xl border border-[#3B181A] kukang-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-[#EF4444]" />
          <h2 className="font-heading text-base font-bold text-white">
            Riwayat & Antrean Sinkronisasi Graph API
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#3B181A] text-stone-400">
              <tr>
                <th className="py-3 px-3">Target Table</th>
                <th className="py-3 px-3">Idempotency Key</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Percobaan</th>
                <th className="py-3 px-3">Waktu Terakhir</th>
                <th className="py-3 px-3">Keterangan / Error</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3B181A]/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-stone-500">
                    Belum ada log sinkronisasi Excel Online.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 px-3 font-mono text-[#E5B94C]">
                      {log.target_table}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-stone-400">
                      {log.idempotency_key}
                    </td>
                    <td className="py-3 px-3">
                      {log.status === "success" && (
                        <span className="inline-flex items-center gap-1 text-[#EF4444] font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Synced
                        </span>
                      )}
                      {log.status === "failed" && (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                          <XCircle className="h-3.5 w-3.5" /> Failed
                        </span>
                      )}
                      {log.status === "skipped_unconfigured" && (
                        <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                          <AlertTriangle className="h-3.5 w-3.5" /> Unconfigured
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-stone-300">
                      {log.attempt_count}x
                    </td>
                    <td className="py-3 px-3 text-stone-400">
                      {formatJakartaDateTime(log.last_attempted_at)}
                    </td>
                    <td className="py-3 px-3 text-stone-400 max-w-xs truncate">
                      {log.error_message || "Berhasil ditambahkan ke workbook"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {log.status !== "success" && (
                        <button
                          onClick={() => handleSyncNow(log.id)}
                          className="rounded-lg bg-amber-500/20 px-2.5 py-1 font-semibold text-amber-300 hover:bg-amber-500/30"
                        >
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}