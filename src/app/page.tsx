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
    <div className="relative min-h-screen w-full overflow-x-hidden bg-transparent text-stone-100 flex flex-col justify-between kukang-silk-overlay">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 w-full border-b border-[#3B181A]/80 bg-[#080506]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4">
          <KukangLogo showTagline hideTaglineOnMobile />

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <Link
              href="/register"
              className="hidden md:inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#C89D3C]/45 bg-[#C89D3C]/10 px-3.5 py-2 text-xs sm:text-sm font-medium text-[#E5B94C] hover:bg-[#C89D3C]/20"
            >
              <UserPlus className="h-4 w-4" />
              <span>Daftar</span>
            </Link>
            <Link
              href="/login?role=member"
              className="whitespace-nowrap rounded-xl border border-[#4A2022] bg-[#160B0C] px-2.5 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-stone-200 hover:border-[#C89D3C]/60 hover:text-white"
            >
              <span className="sm:hidden">Anggota</span>
              <span className="hidden sm:inline">Login Anggota</span>
            </Link>
            <Link
              href="/login?role=admin"
              className="whitespace-nowrap rounded-xl bg-gradient-to-r from-[#9E0B0B] to-[#C81E1E] px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-[#9E0B0B]/30 hover:brightness-110"
            >
              <span className="sm:hidden">Pengurus</span>
              <span className="hidden sm:inline">Login Pengurus</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-20">
        <div className="max-w-3xl space-y-5 sm:space-y-6">
          <div className="inline-flex items-center gap-2 rounded-xl sm:rounded-full border border-[#C89D3C]/40 bg-[#1B0E10]/90 px-3.5 py-2 text-[11px] sm:text-xs font-semibold leading-snug tracking-wide text-[#E5B94C]">
            <Zap className="h-4 w-4 shrink-0 text-[#DC2626]" />
            <span>SILENT DRIVE, POWERFUL IMPACT — INSTITUT TEKNOLOGI SUMATERA</span>
          </div>

          <h1 className="font-heading text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-5xl lg:text-6xl">
            KUKANG EV{" "}
            <span className="bg-gradient-to-r from-[#B91C1C] via-[#EF4444] to-[#E5B94C] bg-clip-text text-transparent">
              ATTENDANCE & CONTRIBUTION
            </span>{" "}
            TRACKER
          </h1>

          <p className="text-sm leading-relaxed text-stone-300/90 sm:text-lg">
            Sistem terpadu manajemen kehadiran berbasis QR Code tervalidasi server,
            dokumentasi bukti kontribusi riset & operasional, serta sinkronisasi
            otomatis ke Microsoft Excel Online untuk tim kendaraan listrik KUKANG EV ITERA.
          </p>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
            <Link
              href="/login?role=member"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#9E0B0B] via-[#B91C1C] to-[#C89D3C] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#9E0B0B]/30 hover:brightness-110"
            >
              <span>Login Anggota & Absen QR</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
            <Link
              href="/register"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#C89D3C]/45 bg-[#1B0E10] px-6 py-3.5 text-sm font-semibold text-[#E5B94C] hover:bg-[#291518]"
            >
              <UserPlus className="h-4 w-4 shrink-0" />
              <span>Daftar Akun Baru</span>
            </Link>
            <Link
              href="/login?role=admin"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#4A2022] bg-[#140A0B] px-6 py-3.5 text-sm font-semibold text-stone-200 hover:border-[#DC2626]/60"
            >
              <span>Portal Pengurus</span>
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
          <div className="kukang-card rounded-2xl p-5 sm:p-6">
            <QrCode className="h-7 w-7 sm:h-8 sm:w-8 text-[#DC2626]" />
            <h2 className="mt-3.5 sm:mt-4 font-heading text-base sm:text-lg font-bold text-white">
              QR Attendance Anti-Manipulasi
            </h2>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-stone-300/80">
              Validasi sesi login, masa berlaku QR dinamis, pencegahan double
              check-in, dan pencatatan timestamp server zona waktu Asia/Jakarta.
            </p>
          </div>

          <div className="kukang-card rounded-2xl p-5 sm:p-6">
            <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8 text-[#E5B94C]" />
            <h2 className="mt-3.5 sm:mt-4 font-heading text-base sm:text-lg font-bold text-white">
              Contribution & Proof Tracker
            </h2>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-stone-300/80">
              Pencatatan output teknis maupun non-teknis lengkap dengan unggahan
              dokumentasi foto/video terverifikasi pengurus divisi.
            </p>
          </div>

          <div className="kukang-card rounded-2xl p-5 sm:p-6">
            <FileSpreadsheet className="h-7 w-7 sm:h-8 sm:w-8 text-[#E5B94C]" />
            <h2 className="mt-3.5 sm:mt-4 font-heading text-base sm:text-lg font-bold text-white">
              Microsoft Excel Online Sync
            </h2>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-stone-300/80">
              Sinkronisasi otomatis ke workbook SharePoint/OneDrive via Microsoft
              Graph API lengkap dengan mekanisme retry idempoten dan ekspor .xlsx.
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-[#3B181A]/80 px-4 py-6 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} KUKANG EV ITERA — Silent Drive, Powerful Impact
      </footer>
    </div>
  );
}