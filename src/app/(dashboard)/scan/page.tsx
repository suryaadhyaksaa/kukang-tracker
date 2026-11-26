import React from "react";
import { QRScanner } from "@/components/attendance/QRScanner";

export default function ScanQRPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">
          Pemindai QR Absensi
        </h1>
        <p className="text-sm text-slate-400">
          Scan QR Code yang ditampilkan oleh pengurus di lokasi kegiatan
        </p>
      </div>
      <QRScanner />
    </div>
  );
}