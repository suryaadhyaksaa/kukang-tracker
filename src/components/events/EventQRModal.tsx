"use client";

import React, { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Printer, X, ShieldAlert, CheckCircle2 } from "lucide-react";
import type { KukangEvent } from "@/types/database";
import { formatJakartaDateTime } from "@/lib/utils";

export function EventQRModal({
  event,
  onClose,
  onToggleDisable,
  isAdmin,
}: {
  event: KukangEvent;
  onClose: () => void;
  onToggleDisable?: (eventId: string, nextDisabled: boolean) => void;
  isAdmin: boolean;
}) {
  const qrWrapperRef = useRef<HTMLDivElement>(null);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const checkInUrl = `${baseUrl}/checkin/${event.qr_token}`;

  function handleDownloadPNG() {
    const canvas = qrWrapperRef.current?.querySelector("canvas");
    if (!canvas) return;
    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = `QR_KUKANG_EV_${event.title.replace(/\s+/g, "_")}.png`;
    link.click();
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#3B181A] kukang-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#3B181A] pb-4">
          <div>
            <h3 className="font-heading text-lg font-bold text-white">
              QR Code Absensi Kegiatan
            </h3>
            <p className="text-xs text-stone-400">KUKANG EV ITERA</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Printable Poster Area */}
        <div
          id="printable-qr-poster"
          className="mt-5 flex flex-col items-center rounded-2xl border border-[#3B181A] bg-[#090607] p-6 text-center"
        >
          <span className="rounded-full bg-[#9E0B0B]/25 px-3 py-1 text-xs font-semibold text-[#EF4444] border border-[#DC2626]/40">
            SILENT DRIVE, POWERFUL IMPACT
          </span>
          <h4 className="mt-3 font-heading text-lg font-bold text-white">
            {event.title}
          </h4>
          <p className="mt-1 text-xs text-stone-400">
            Lokasi: {event.location}
          </p>

          <div
            ref={qrWrapperRef}
            className="my-5 rounded-2xl bg-white p-4 shadow-lg"
          >
            <QRCodeCanvas
              value={checkInUrl}
              size={220}
              level="H"
              includeMargin={false}
            />
          </div>

          <p className="font-mono text-xs tracking-wider text-[#E5B94C]">
            TOKEN: {event.qr_token}
          </p>
          <p className="mt-2 text-[11px] text-stone-400">
            Aktif: {formatJakartaDateTime(event.qr_active_from)} s/d{" "}
            {formatJakartaDateTime(event.qr_active_until)}
          </p>
        </div>

        {/* Status & Controls */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-[#3B181A] bg-[#090607] px-4 py-3 text-xs">
          <div className="flex items-center gap-2">
            {event.is_qr_manually_disabled ? (
              <>
                <ShieldAlert className="h-4 w-4 text-rose-400" />
                <span className="font-medium text-rose-300">
                  QR Dinonaktifkan Manual
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-[#EF4444]" />
                <span className="font-medium text-red-300">
                  QR Aktif Sesuai Jadwal
                </span>
              </>
            )}
          </div>

          {isAdmin && onToggleDisable && (
            <button
              onClick={() =>
                onToggleDisable(event.id, !event.is_qr_manually_disabled)
              }
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                event.is_qr_manually_disabled
                  ? "bg-[#9E0B0B]/30 text-red-300 hover:bg-gradient-to-r from-[#9E0B0B] to-[#C81E1E]/30"
                  : "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
              }`}
            >
              {event.is_qr_manually_disabled ? "Aktifkan QR" : "Nonaktifkan QR"}
            </button>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={handleDownloadPNG}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9E0B0B] to-[#C81E1E] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <Download className="h-4 w-4" />
            <span>Unduh PNG</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#C89D3C]/45 bg-[#C89D3C]/15 px-4 py-2.5 text-sm font-semibold text-[#F5D06F] transition hover:bg-[#C89D3C]/25"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak QR</span>
          </button>
        </div>
      </div>
    </div>
  );
}