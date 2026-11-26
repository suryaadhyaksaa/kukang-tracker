import Link from "next/link";
import {
  QrCode,
  FileSpreadsheet,
  ArrowRight,
  Zap,
  CheckCircle2,
  UserPlus,
} from "lucide-react";
import { KukangLogo } from "@/components/brand/KukangLogo";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-transparent text-stone-100 flex flex-col justify-between kukang-silk-overlay overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/3 h-80 w-80 rounded-full bg-[#C89D3C]/20 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-40 -right-20 h-96 w-96 rounded-full bg-[#9E0B0B]/25 blur-[130px]"
      />

      <header className="relative z-10 border-b border-[#3B181A]/80 bg-transparent/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <KukangLogo showTagline />
          <div className="flex items-center gap-2.5">
            <Link
              href="/register"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#C89D3C]/45 bg-[#C89D3C]/10 px-4 py-2 text-sm font-medium text-[#E5B94C] transition hover:bg-[#C89D3C]/20"
            >
              <UserPlus className="h-4 w-4" />
              <span>Daftar</span>
            </Link>
            <Link
              href="/login?role=member"
              className="rounded-xl border border-[#4A2022] bg-[#160B0C] px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-[#C89D3C]/60 hover:text-white"
            >
              Login Anggota
            </Link>
            <Link
              href="/login?role=admin"
              className="rounded-xl bg-gradient-to-r from-[#9E0B0B] to-[#C81E1E] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#9E0B0B]/30 transition hover:brightness-110"
            >
              Login Pengurus
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C89D3C]/40 bg-[#1B0E10] px-3.5 py-1.5 text-xs font-semibold tracking-wide text-[#E5B94C]">
            <Zap className="h-3.5 w-3.5 text-[#DC2626]" />
            <span>SILENT DRIVE, POWERFUL IMPACT — INSTITUT TEKNOLOGI SUMATERA</span>
          </div>

          <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-6xl">
            KUKANG EV{" "}
            <span className="bg-gradient-to-r from-[#9E0B0B] via-[#DC2626] to-[#E5B94C] bg-clip-text text-transparent">
              ATTENDANCE & CONTRIBUTION
            </span>{" "}
            TRACKER
          </h1>

          <p className="text-base leading-relaxed text-stone-300/90 sm:text-lg">
            Sistem terpadu manajemen kehadiran berbasis QR Code tervalidasi server,
            dokumentasi bukti kontribusi riset & operasional, serta sinkronisasi
            otomatis ke Microsoft Excel Online untuk tim kendaraan listrik KUKANG EV ITERA.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/login?role=member"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9E0B0B] via-[#B91C1C] to-[#C89D3C] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#9E0B0B]/30 transition hover:brightness-110"
            >
              <span>Login Anggota & Absen QR</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl border border-[#C89D3C]/45 bg-[#1B0E10] px-6 py-3.5 text-sm font-semibold text-[#E5B94C] transition hover:bg-[#291518]"
            >
              <UserPlus className="h-4 w-4" />
              <span>Daftar Akun Baru</span>
            </Link>
            <Link
              href="/login?role=admin"
              className="inline-flex items-center gap-2 rounded-xl border border-[#4A2022] bg-[#140A0B] px-6 py-3.5 text-sm font-semibold text-stone-200 transition hover:border-[#DC2626]/60"
            >
              <span>Portal Pengurus</span>
            </Link>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="kukang-card rounded-2xl p-6 transition hover:-translate-y-0.5">
            <QrCode className="h-8 w-8 text-[#DC2626]" />
            <h2 className="mt-4 font-heading text-lg font-bold text-white">
              QR Attendance Anti-Manipulasi
            </h2>
            <p className="mt-2 text-sm text-stone-300/80">
              Validasi sesi login, masa berlaku QR dinamis, pencegahan double
              check-in, dan pencatatan timestamp server zona waktu Asia/Jakarta.
            </p>
          </div>

          <div className="kukang-card rounded-2xl p-6 transition hover:-translate-y-0.5">
            <CheckCircle2 className="h-8 w-8 text-[#E5B94C]" />
            <h2 className="mt-4 font-heading text-lg font-bold text-white">
              Contribution & Proof Tracker
            </h2>
            <p className="mt-2 text-sm text-stone-300/80">
              Pencatatan output teknis maupun non-teknis lengkap dengan unggahan
              dokumentasi foto/video terverifikasi pengurus divisi.
            </p>
          </div>

          <div className="kukang-card rounded-2xl p-6 transition hover:-translate-y-0.5">
            <FileSpreadsheet className="h-8 w-8 text-[#E5B94C]" />
            <h2 className="mt-4 font-heading text-lg font-bold text-white">
              Microsoft Excel Online Sync
            </h2>
            <p className="mt-2 text-sm text-stone-300/80">
              Sinkronisasi otomatis ke workbook SharePoint/OneDrive via Microsoft
              Graph API lengkap dengan mekanisme retry idempoten dan ekspor .xlsx.
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-[#3B181A]/80 py-6 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} KUKANG EV ITERA — Silent Drive, Powerful Impact
      </footer>
    </div>
  );
}