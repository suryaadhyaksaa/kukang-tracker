"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Hash,
  Mail,
  Lock,
  Phone,
  Calendar,
  Layers,
  AlertCircle,
  UserPlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { KukangLogo } from "@/components/brand/KukangLogo";

interface DivisionOption {
  id: string;
  name: string;
}

export function RegisterForm({ divisions }: { divisions: DivisionOption[] }) {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [nim, setNim] = useState("");
  const [angkatan, setAngkatan] = useState(2024);
  const [divisionId, setDivisionId] = useState(divisions[0]?.id || "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal harus 6 karakter.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          nim,
          angkatan,
          division_id: divisionId || null,
          phone,
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Pendaftaran gagal.");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        router.push("/login");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server pendaftaran.");
      setLoading(false);
    }
  }

  return (
    <div className="kukang-card w-full max-w-lg rounded-2xl p-7 sm:p-8 shadow-2xl">
      <div className="mb-6 flex flex-col items-center text-center">
        <KukangLogo showTagline size="lg" />
        <h1 className="mt-5 font-heading text-2xl font-bold text-white">
          Daftar Akun Anggota
        </h1>
        <p className="mt-1 text-xs text-stone-400">
          Aktivasi akses absensi QR & pelaporan kontribusi KUKANG EV ITERA
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-950/60 p-3 text-xs text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-300">
              Nama Lengkap
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-stone-500" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nama sesuai KTM"
                className="w-full rounded-xl border border-[#4A2022] bg-[#090607] py-2.5 pl-10 pr-3 text-xs text-white placeholder-stone-500 focus:border-[#C89D3C] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-300">
              NIM ITERA
            </label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-3 h-4 w-4 text-stone-500" />
              <input
                type="text"
                required
                value={nim}
                onChange={(e) => setNim(e.target.value)}
                placeholder="Contoh: 124490052"
                className="w-full rounded-xl border border-[#4A2022] bg-[#090607] py-2.5 pl-10 pr-3 text-xs text-white placeholder-stone-500 focus:border-[#C89D3C] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-300">
              Angkatan
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-3 h-4 w-4 text-stone-500" />
              <input
                type="number"
                required
                min={2014}
                max={2035}
                value={angkatan}
                onChange={(e) => setAngkatan(Number(e.target.value))}
                className="w-full rounded-xl border border-[#4A2022] bg-[#090607] py-2.5 pl-10 pr-3 text-xs text-white focus:border-[#C89D3C] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-300">
              Nomor WhatsApp (Opsional)
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 h-4 w-4 text-stone-500" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812xxxxxxxx"
                className="w-full rounded-xl border border-[#4A2022] bg-[#090607] py-2.5 pl-10 pr-3 text-xs text-white placeholder-stone-500 focus:border-[#C89D3C] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-stone-300">
            Divisi Kukang EV
          </label>
          <div className="relative">
            <Layers className="absolute left-3.5 top-3 h-4 w-4 text-stone-500" />
            <select
              value={divisionId}
              onChange={(e) => setDivisionId(e.target.value)}
              className="w-full rounded-xl border border-[#4A2022] bg-[#090607] py-2.5 pl-10 pr-3 text-xs text-white focus:border-[#C89D3C] focus:outline-none"
            >
              {divisions.length === 0 ? (
                <option value="">Umum / Belum Ditentukan</option>
              ) : (
                divisions.map((div) => (
                  <option key={div.id} value={div.id}>
                    {div.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-stone-300">
            Email Resmi
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3 h-4 w-4 text-stone-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama.nim@student.itera.ac.id"
              className="w-full rounded-xl border border-[#4A2022] bg-[#090607] py-2.5 pl-10 pr-3 text-xs text-white placeholder-stone-500 focus:border-[#C89D3C] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-300">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-stone-500" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full rounded-xl border border-[#4A2022] bg-[#090607] py-2.5 pl-10 pr-3 text-xs text-white placeholder-stone-500 focus:border-[#C89D3C] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-300">
              Ulangi Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-stone-500" />
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang password"
                className="w-full rounded-xl border border-[#4A2022] bg-[#090607] py-2.5 pl-10 pr-3 text-xs text-white placeholder-stone-500 focus:border-[#C89D3C] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9E0B0B] via-[#B91C1C] to-[#C89D3C] py-3 text-sm font-bold text-white shadow-lg shadow-black/50 transition hover:brightness-110 disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" />
          <span>{loading ? "Mendaftarkan Akun..." : "Daftar & Masuk"}</span>
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-stone-400">
        Sudah memiliki akun?{" "}
        <Link
          href="/login"
          className="font-semibold text-[#E5B94C] hover:underline"
        >
          Masuk di sini
        </Link>
      </p>
    </div>
  );
}