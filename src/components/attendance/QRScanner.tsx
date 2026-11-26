"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, KeyRound, AlertCircle } from "lucide-react";

export function QRScanner() {
  const router = useRouter();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const regionId = "kukang-qr-reader";
    const html5Qr = new Html5Qrcode(regionId);
    scannerRef.current = html5Qr;

    html5Qr
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          html5Qr.stop().catch(() => {});
          // Ekstrak token baik dari URL penuh (/checkin/KEV-XXX) maupun raw token
          const parts = decodedText.split("/checkin/");
          const token = parts.length > 1 ? parts[1].trim() : decodedText.trim();
          router.push(`/checkin/${encodeURIComponent(token)}`);
        },
        () => {
          // Frame belum mendeteksi QR — abaikan noise
        }
      )
      .then(() => setIsScanning(true))
      .catch(() => {
        setScanError(
          "Kamera tidak dapat diakses. Pastikan izin kamera aktif atau gunakan input token manual di bawah."
        );
      });

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [router]);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualToken.trim()) return;
    router.push(`/checkin/${encodeURIComponent(manualToken.trim())}`);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="rounded-2xl border border-[#3B181A] kukang-card p-5">
        <div className="mb-4 flex items-center gap-2 text-[#EF4444]">
          <Camera className="h-5 w-5" />
          <h2 className="font-heading text-lg font-semibold text-white">
            Pindai QR Code Kegiatan
          </h2>
        </div>

        <div
          id="kukang-qr-reader"
          className="overflow-hidden rounded-xl border border-[#4A2022] bg-[#090607]"
        />

        {isScanning && (
          <p className="mt-3 text-center text-xs text-[#E5B94C]">
            Arahkan kamera smartphone ke QR Code kegiatan KUKANG EV
          </p>
        )}

        {scanError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{scanError}</span>
          </div>
        )}
      </div>

      <form
        onSubmit={handleManualSubmit}
        className="rounded-2xl border border-[#3B181A] kukang-card p-5"
      >
        <div className="mb-3 flex items-center gap-2 text-[#E5B94C]">
          <KeyRound className="h-4 w-4" />
          <h3 className="font-heading text-sm font-semibold text-white">
            Input Token Kegiatan Manual
          </h3>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Contoh: KEV-9A8B7C6D..."
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            className="flex-1 rounded-xl border border-[#4A2022] bg-[#090607] px-3.5 py-2.5 text-sm text-white placeholder-stone-500 focus:border-[#C89D3C] focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-[#9E0B0B] to-[#C81E1E] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Lanjut
          </button>
        </div>
      </form>
    </div>
  );
}